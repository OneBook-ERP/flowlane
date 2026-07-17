/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts}',
    // frappe-ui ships .vue source; its Tailwind classes must be scanned or they
    // get purged, leaving frappe-ui components unstyled.
    './node_modules/frappe-ui/src/**/*.{vue,js,ts}',
  ],
  presets: [require('frappe-ui/tailwind')],
}
