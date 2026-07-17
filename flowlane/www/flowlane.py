import frappe
from frappe.sessions import get_csrf_token


def get_context(context):
	"""Serve the SPA boot, gating the app behind login.

	Guests are redirected to /login (the app's data is per-user and every write
	needs auth). Logged-in users get the CSRF token (without it writes 400) and
	their name for the UI.
	"""
	if frappe.session.user == "Guest":
		path = (frappe.local.request.path if frappe.local.request else "") or "/flowlane"
		frappe.local.flags.redirect_location = f"/login?redirect-to={path}"
		raise frappe.Redirect

	context.boot = {
		"csrf_token": get_csrf_token(),
		"user_id": frappe.session.user,
		"full_name": frappe.utils.get_fullname(frappe.session.user),
	}
	context.no_cache = 1
	return context
