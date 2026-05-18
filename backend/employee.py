import threading
from datetime import datetime
from flask import Blueprint, jsonify, request
from utils import get_db_cursor, send_submission_emails,send_teams_alert
import re
from auth import employee_required
from flask import session, jsonify
employee_bp = Blueprint('employee_bp', __name__)

# ==========================================
# 🚀 CORE ROUTE 1: GET ALL KPIS FOR USER (MASTER CACHE)
# ==========================================
@employee_bp.route('/api/dashboard/goals', methods=['GET'])
@employee_required
def get_dashboard_goals():
    try:
        user_id = session.get('id')

        if not user_id:
            return jsonify({"error": "Missing user_id query parameter."}), 400

        query = """
            SELECT * FROM kpis 
            WHERE user_id = %s 
            ORDER BY quarter ASC, id ASC;
        """
        
        with get_db_cursor() as cur:
            cur.execute(query, (user_id,))
            all_user_goals = cur.fetchall()

        return jsonify({"success": True, "goals": all_user_goals}), 200

    except Exception as e:
        print("Backend Error fetching master goals:", e)
        return jsonify({"error": "Database read failed."}), 500



@employee_bp.route('/api/goals/bulk-update', methods=['POST'])
@employee_required
def bulk_update_goals():
    try:
        data = request.json
        user_id = session.get('id')
        quarter = data.get('quarter')
        modified_goals = data.get('goals', []) 
        deleted_ids = data.get('deleted_ids', [])

        if not user_id or not quarter:
            return jsonify({"error": "Missing user authentication context or quarter payload."}), 400

        # Allow execution if there are modifications OR deletions
        if not modified_goals and not deleted_ids:
            return jsonify({"success": True, "message": "No modification parameters detected to update."}), 200

        # 🛡️ LAYER 1: Strict Schema & UoM Validation for each modified/new goal node
        for goal in modified_goals:
            title = goal.get('title')
            uom = goal.get('uom')
            target = str(goal.get('target')).strip()
            weight = int(goal.get('weight', 0))

            if weight < 10:
                return jsonify({"error": f"Rule Violation: Objective '{title[:25]}...' must have at least 10% weightage."}), 400

            if uom == '%':
                try:
                    val = float(target)
                    if val < 0 or val > 100:
                        return jsonify({"error": f"Bounds Error: Percentage target for '{title[:25]}...' must be between 0 and 100."}), 400
                except ValueError:
                    return jsonify({"error": "Target must be a clean float for percentage fields."}), 400
            elif uom == 'Numeric':
                try:
                    if float(target) < 0:
                        return jsonify({"error": f"Validation Error: Numeric target for '{title[:25]}...' cannot be negative."}), 400
                except ValueError:
                    return jsonify({"error": "Target parameter must be numeric."}), 400
            elif uom == 'Timeline':
                try:
                    datetime.strptime(target, '%Y-%m-%d')
                except ValueError:
                    return jsonify({"error": f"Format Mismatch: Date target for '{title[:25]}...' must follow YYYY-MM-DD format."}), 400
            elif uom == 'Zero-based':
                goal['target'] = '0'

        with get_db_cursor() as cur:
            # 🛡️ BRD VALIDATION: MAX 8 GOALS CHECK UPFRONT
            if deleted_ids:
                # Count goals that will remain after deletions
                cur.execute("SELECT COUNT(*) AS remaining FROM kpis WHERE user_id = %s AND quarter = %s AND id NOT IN %s", (user_id, quarter, tuple(deleted_ids)))
            else:
                cur.execute("SELECT COUNT(*) AS remaining FROM kpis WHERE user_id = %s AND quarter = %s", (user_id, quarter))
            
            remaining_db_count = cur.fetchone()['remaining']
            new_additions_count = sum(1 for g in modified_goals if str(g.get('id')).startswith('new_'))

            if (remaining_db_count + new_additions_count) > 8:
                return jsonify({"error": "Rule Violation: You cannot have more than 8 goals in a single quarter sheet."}), 400

            # 🗑️ THE DELETE EXECUTION ENGINE (Runs first, independent of existing_ids)
            if deleted_ids:
                del_tuple = tuple(deleted_ids)
                
                # SECURITY: Verify they own the goal and it is NOT locked
                cur.execute("""
                    SELECT id FROM kpis 
                    WHERE id IN %s AND user_id = %s AND manager_locked = false AND admin_locked = false
                """, (del_tuple, user_id))
                
                valid_deletes = cur.fetchall()
                
                if valid_deletes:
                    valid_delete_ids = tuple(d['id'] for d in valid_deletes)
                    
                    # 1. Log the deletion in Audit Trail BEFORE wiping the row
                    for d_id in valid_delete_ids:
                        cur.execute("""
                            INSERT INTO audit_logs (kpi_id, action_type, details)
                            VALUES (%s, 'GOAL_DELETED', 'Employee deleted this objective from their draft sheet.')
                        """, (d_id,))
                        
                    # 2. Execute actual Database Wipe
                    cur.execute("DELETE FROM kpis WHERE id IN %s", (valid_delete_ids,))
                    print(f"🗑️ Cleanly wiped {len(valid_delete_ids)} goals from database.")

            # 🔒 LAYER 2: Core Security State Check (Only check existing IDs, skip 'new_' rows)
            existing_ids = [g.get('id') for g in modified_goals if not str(g.get('id')).startswith('new_')]
            
            if existing_ids:
                cur.execute("SELECT id, manager_locked, admin_locked FROM kpis WHERE id IN %s AND user_id = %s", (tuple(existing_ids), user_id))
                states = cur.fetchall()
                for s in states:
                    if s['manager_locked'] or s['admin_locked']:
                        return jsonify({"error": "Access Denied: Target rows are already verified & locked."}), 403
            
            # 💾 LAYER 3: Atomic Batch DB Updates & Inserts Execution 
            for goal in modified_goals:
                goal_id = str(goal.get('id'))
                
                if goal_id.startswith('new_'):
                    # 🚀 OPTIMIZATION: Insert Goal & Log Audit in 1 Query
                    cur.execute("""
                        WITH inserted_kpi AS (
                            INSERT INTO kpis (user_id, quarter, thrust_area, title, uom, target, weightage)
                            VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id
                        )
                        INSERT INTO audit_logs (kpi_id, action_type, details)
                        SELECT id, 'GOAL_CREATED', 'Employee created a new objective draft.' FROM inserted_kpi;
                    """, (user_id, quarter, goal.get('thrustArea'), goal.get('title'), goal.get('uom'), str(goal.get('target')), int(goal.get('weight'))))
                else:
                    # 🚀 OPTIMIZATION: Update Goal & Log Audit in 1 Query
                    cur.execute("""
                        WITH updated_kpi AS (
                            UPDATE kpis 
                            SET title = %s, thrust_area = %s, uom = %s, target = %s, weightage = %s
                            WHERE id = %s AND user_id = %s
                            RETURNING id
                        )
                        INSERT INTO audit_logs (kpi_id, action_type, details)
                        SELECT id, 'GOAL_MODIFIED', 'Employee modified the objective target/weightage parameters.' FROM updated_kpi;
                    """, (goal.get('title'), goal.get('thrustArea'), goal.get('uom'), str(goal.get('target')), int(goal.get('weight')), int(goal_id), user_id))
            
            # ⚖️ LAYER 4: Final Database Total Quarter Load Verification
            cur.execute("SELECT COALESCE(SUM(weightage), 0) AS final_weight FROM kpis WHERE user_id = %s AND quarter = %s", (user_id, quarter))
            result = cur.fetchone()
            total_quarter_weight = result['final_weight']
            
            # Allow weight to be 0 ONLY if they deleted all goals (empty draft). Otherwise must be exactly 100.
            if total_quarter_weight > 0 and total_quarter_weight != 100:
                raise Exception(f"Validation Crash: The compiled state total weight evaluates to {total_quarter_weight}%. It must equal exactly 100%. Rolling back changes.")

        return jsonify({"success": True, "message": "Bulk goals & new additions synchronized safely!"}), 200

    except Exception as e:
        print("Crash dump at bulk update sequence execution:", e)
        return jsonify({"error": str(e) if "Validation Crash" in str(e) else "Database bulk operations failed."}), 500
@employee_bp.route('/api/goals/submit', methods=['POST'])
@employee_required
def submit_goals():
    try:
        data = request.json
        user_id = session.get('id')
        quarter = data.get('quarter')
        goals_list = data.get('goals')

        if not user_id or not quarter or not goals_list:
            return jsonify({"error": "Missing payload data (user_id, quarter, or goals)."}), 400
        if len(goals_list) > 8:
            return jsonify({"error": "Rule Violation: Goal sheet exceeds the maximum limit of 8 objectives."}), 400
        # 🛡️ VALIDATION 1: Verify 100% weightage rule securely
        total_weight = sum(int(g.get('weight', 0)) for g in goals_list)
        if total_weight != 100:
            return jsonify({"error": "Total weightage must be exactly 100%."}), 400

        # 🛡️ VALIDATION 2: Strict UoM & Min Weight Check for every single goal
        for goal in goals_list:
            title = goal.get('title', '')
            uom = goal.get('uom')
            target = str(goal.get('target')).strip()
            weight = int(goal.get('weight', 0))

            if weight < 10:
                return jsonify({"error": f"Rule Violation: Objective '{title[:25]}...' must have at least 10% weightage."}), 400

            if uom == '%':
                try:
                    val = float(target)
                    if val < 0 or val > 100:
                        return jsonify({"error": f"Bounds Error: Percentage target for '{title[:25]}...' must be between 0 and 100."}), 400
                except ValueError:
                    return jsonify({"error": "Target must be a clean numeric float for percentage fields."}), 400
            elif uom == 'Numeric':
                try:
                    if float(target) < 0:
                        return jsonify({"error": f"Validation Error: Numeric target for '{title[:25]}...' cannot be negative."}), 400
                except ValueError:
                    return jsonify({"error": "Target parameter must be numeric."}), 400
            elif uom == 'Timeline':
                try:
                    datetime.strptime(target, '%Y-%m-%d')
                except ValueError:
                    return jsonify({"error": f"Format Mismatch: Date target for '{title[:25]}...' must follow YYYY-MM-DD format."}), 400
            elif uom == 'Zero-based':
                goal['target'] = '0'

        query = """
            INSERT INTO kpis (user_id, quarter, thrust_area, title, uom, target, weightage)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """

        with get_db_cursor() as cur:
            # 1. Runs a loop to insert all goals safely
            for goal in goals_list:
                cur.execute(query, (
                    user_id, quarter, goal.get('thrustArea'), goal.get('title'), 
                    goal.get('uom'), str(goal.get('target')), int(goal.get('weight'))
                ))
            
        # 2. 🚀 OPTIMIZATION: Fetch Employee and Manager Details directly from Session
        emp_name = session.get('name')
        emp_email = session.get('email')
        mgr_email = session.get('mgr_email')

        # 3. Fire the Email Thread (Background execution)
        if emp_email:
            threading.Thread(
                target=send_submission_emails, 
                args=(emp_name, emp_email, mgr_email, quarter, goals_list)
            ).start()
            teams_message = f"**{emp_name}** has just submitted their **{quarter}** objectives for manager review. Total weightage assigned: 100%."
            threading.Thread(
                    target=send_teams_alert, 
                    args=(f"New Goals Submitted by {emp_name}", teams_message)
                ).start()   
        return jsonify({"success": True, "message": f"{quarter} Objectives successfully submitted. Your Manager has been notified!"}), 200

    except Exception as e:
        print("Failed to submit goals:", e)
        return jsonify({"error": "Database writing operation failed."}), 500

@employee_bp.route('/api/goals/bulk-log-progress', methods=['POST'])
@employee_required
def bulk_log_progress():
    try:
        data = request.json
        user_id = session.get('id')
        updates = data.get('updates', []) 

        if not user_id or not updates:
            return jsonify({"error": "Missing user ID or updates payload."}), 400

        with get_db_cursor() as cur:
            # 1. Fetch current DB state for all IDs to validate Security Rules & get targets
            update_ids = [u.get('id') for u in updates]
            cur.execute("SELECT id, title, uom, target, manager_locked, admin_locked FROM kpis WHERE id IN %s AND user_id = %s", (tuple(update_ids), user_id))
            db_goals_list = cur.fetchall()
            db_goals = {row['id']: row for row in db_goals_list}

            if len(db_goals) != len(update_ids):
                return jsonify({"error": "One or more target rows not found in database."}), 404

            processed_updates = []

            # 2. Strict Validations & SMART AUTO-COMPUTE LOOP
            for update in updates:
                gid = update.get('id')
                db_goal = db_goals[gid]
                
                # 🛡️ SECURITY CHECK: Manager MUST have approved it. Admin MUST NOT have frozen it.
                if not db_goal['manager_locked']:
                    return jsonify({"error": f"Security Alert: Goal ID {gid} is not yet approved by manager."}), 403
                if db_goal['admin_locked']:
                    return jsonify({"error": f"Security Alert: HR Admin has locked this cycle. Goal ID {gid} cannot be updated."}), 403

                # 🛡️ SERVER-SIDE PROGRESS COMPUTATION (POSTMAN HACK PREVENTION)
                uom = db_goal['uom']
                target = db_goal['target']
                title = db_goal['title']
                actual = update.get('actual_performance')
                
                secure_status = 'Not Started'
                
                if actual != '' and actual is not None:
                    score = 0
                    if uom == '%':
                        val = float(actual)
                        if val < 0 or val > 100:
                            return jsonify({"error": "Actual percentage must be strictly between 0 and 100."}), 400
                        t_val = float(target)
                        score = (val / t_val) * 100 if t_val > 0 else (100 if val > 0 else 0)
                        
                    elif uom == 'Numeric':
                        val = float(actual)
                        if val < 0:
                            return jsonify({"error": "Actual numeric values cannot be negative."}), 400
                        t_val = float(target)
                        
                        if t_val == 0:
                            score = 100 if val > 0 else 0
                        else:
                            # Python Regex for "Lower is better" check
                            is_lower_better = bool(re.search(r'reduce|decrease|lower|drop|minimize', str(title), re.IGNORECASE))
                            if is_lower_better:
                                score = 100 if val <= t_val else (t_val / val) * 100
                            else:
                                score = (val / t_val) * 100

                    elif uom == 'Timeline':
                        try:
                            t_date = datetime.strptime(str(target), '%Y-%m-%d')
                            a_date = datetime.strptime(str(actual), '%Y-%m-%d')
                            score = 100 if a_date <= t_date else 80 # Penalty for overdue
                        except:
                            score = 0

                    elif uom == 'Zero-based':
                        actual = '0' # Clean up
                        score = 100 if str(actual).strip() == '0' else 0
                    
                    # Cap the score between 0 and 100 securely
                    score = max(0, min(100, round(score)))
                    
                    # Lock in the final system status
                    if score >= 100:
                        secure_status = 'Completed'
                    elif score > 0:
                        secure_status = 'On Track'
                    else:
                        secure_status = 'Not Started'
                else:
                    actual = None

                # Store the securely calculated data for the DB transaction
                processed_updates.append({
                    'id': gid,
                    'actual': actual,
                    'secure_status': secure_status
                })

            # 3. Atomic Batch Update execution using the Secure Status
            # 3. Atomic Batch Update & Audit Logging Execution (1-HIT CTE)
            for p_update in processed_updates:
                log_detail = f"Employee logged actual performance: {p_update['actual']}. System computed status: {p_update['secure_status']}."
                cur.execute("""
                    WITH updated_kpi AS (
                        UPDATE kpis 
                        SET actual_performance = %s, performance_status = %s 
                        WHERE id = %s AND user_id = %s
                        RETURNING id
                    )
                    INSERT INTO audit_logs (kpi_id, action_type, details)
                    SELECT id, 'PROGRESS_LOGGED', %s FROM updated_kpi;
                """, (p_update['actual'], p_update['secure_status'], p_update['id'], user_id, log_detail))
        return jsonify({"success": True, "message": "All actuals and progress statuses updated securely!"}), 200

    except ValueError:
        return jsonify({"error": "Invalid data format provided for actual performance."}), 400
    except Exception as e:
        print("Error logging progress:", e)
        return jsonify({"error": "Database error while updating progress batch."}), 500
