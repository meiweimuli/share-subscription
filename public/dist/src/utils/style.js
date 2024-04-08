export function style(css) {
  const style = document.createElement('style')
  style.innerText = css
  document.head.appendChild(style)
}