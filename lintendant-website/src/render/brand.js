// Brand vectors. The wordmark paths are lifted unchanged from the inline SVG
// of the legacy lintendant.com header (navy background removed), so the
// letterforms — including the stemless "E" — are the official ones. Letters
// use currentColor so the same mark works on navy and on white; the
// apostrophe bar keeps the brand slate.

const WORDMARK_BODY = `<g transform="translate(6328 2966.614)">
<path d="M22.345,20.4V32.193h7.076v2.7H19.2V20.4Z" transform="translate(-6325.635 -2960.758)"/>
<path d="M38.445,20.4V34.776H35.3V20.4Z" transform="translate(-6319.436 -2960.766)"/>
<path class="wm-apos" d="M32.672,0V22.912H31.1V0Z" transform="translate(-6324.17 -2966.614)" fill="#7c878e"/>
<path d="M46.633,20.4,52.7,30.059h0V20.4h2.92V34.776H52.473L46.52,25.117h0v9.659H43.6V20.4Z" transform="translate(-6317.18 -2960.766)"/>
<path d="M58.6,23.1V20.4H70.393v2.7H66.125V34.889H62.98V23.1Z" transform="translate(-6313.465 -2960.758)"/>
<path d="M91.145,20.4l6.065,9.659h0V20.4h2.92V34.776H96.985l-5.953-9.659h0v9.659H88V20.4Z" transform="translate(-6306.154 -2960.766)"/>
<path d="M110.49,20.4a6.59,6.59,0,0,1,2.583.449,8.544,8.544,0,0,1,2.134,1.348,6.3,6.3,0,0,1,1.348,2.246A8.856,8.856,0,0,1,117,27.588a8.375,8.375,0,0,1-.449,2.92,4.866,4.866,0,0,1-1.235,2.246,7,7,0,0,1-2.022,1.572,7.512,7.512,0,0,1-2.92.562H104.2V20.4Zm-.225,11.793a5.637,5.637,0,0,0,1.348-.225,2.568,2.568,0,0,0,1.123-.786,3.884,3.884,0,0,0,.786-1.348,5.441,5.441,0,0,0,.337-2.022,12.376,12.376,0,0,0-.225-2.022,2.94,2.94,0,0,0-.674-1.46,3.511,3.511,0,0,0-1.235-1.011,5.441,5.441,0,0,0-2.022-.337h-2.246v9.1h2.808Z" transform="translate(-6302.086 -2960.758)"/>
<path d="M127.248,20.4l5.391,14.376h-3.257l-1.123-3.257h-5.391l-1.123,3.257H118.6L124.1,20.4h3.145Zm.225,8.873-1.8-5.279h0l-1.909,5.279Z" transform="translate(-6298.408 -2960.766)"/>
<path d="M138.333,20.4l6.065,9.659h0V20.4h2.92V34.776h-3.145l-5.953-9.659h0v9.659H135.3V20.4Z" transform="translate(-6294.422 -2960.766)"/>
<path d="M150.3,23.1V20.4h11.793v2.7h-4.268V34.889H154.68V23.1Z" transform="translate(-6288.325 -2960.758)"/>
<g transform="translate(-6236.444 -2940.358)"><rect width="10.782" height="2.696"/><rect width="10.782" height="2.696" y="11.793"/><rect width="10.782" height="2.696" y="5.953"/></g>
</g>`

export const WORDMARK_VIEWBOX = "21.5 0 180.4 40.8"

export function wordmark({ className = "", label = "L'Intendant", color } = {}) {
  const colorAttr = color ? ` color="${color}"` : ""
  return `<svg class="${className}" viewBox="${WORDMARK_VIEWBOX}" fill="currentColor"${colorAttr} role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${WORDMARK_BODY}</svg>`
}

// The square "L'" mark (src/assets/brand/lintendant-mark.svg in the risk
// register app): white upright, slate base, slate apostrophe on navy.
export const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="75 75 1350 1350"><rect x="75" y="75" width="1350" height="1350" fill="#003865"/><polygon points="462,338 660,338 660,944 462,1142" fill="#FFFFFF"/><polygon points="680,964 1038,964 1038,1162 482,1162" fill="#7C878E"/><rect x="1038" y="75" width="102" height="364" fill="#7C878E"/></svg>`

// The three shapes of the mark on their own, for large decorative use.
export function markShapes(className = "") {
  return `<svg class="${className}" viewBox="400 75 800 1150" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><polygon class="ms-stem" points="462,338 660,338 660,944 462,1142"/><polygon class="ms-base" points="680,964 1038,964 1038,1162 482,1162"/><rect class="ms-apos" x="1038" y="75" width="102" height="364"/></svg>`
}
