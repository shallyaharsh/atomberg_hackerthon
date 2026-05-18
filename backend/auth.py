from functools import wraps
from flask import session, jsonify

def role_required(allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # 1. Check if user is actually logged in
            if 'id' not in session:
                return jsonify({"error": "Unauthorized. Please log in first."}), 401
            
            # 2. Check if their role is allowed for this route
            current_role = session.get('role')
            if current_role not in allowed_roles:
                return jsonify({"error": f"Access Denied. Required role: {allowed_roles}"}), 403

            # 3. Just return the original function! 
            # You can securely use session.get('id') directly inside your routes.
            return f(*args, **kwargs)
            
        return decorated_function
    return decorator

# 🚀 Ready-to-use decorators
admin_required = role_required(['admin'])
manager_required = role_required(['manager', 'admin'])
employee_required = role_required(['employee'])