function createElement (
  tagOrComponent,
  props = {},
  ...children
) {
  const flattenedChildren = children
    .reduce((acc, cur) => acc.concat(cur), [])
    .filter((child) => typeof child !== 'undefined' && child !== null && child !== false)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') {
        const text = `${child}`
        return {
          tagOrComponent: 'TEXT_NODE',
          text,
          props: { children: [] },
          children: []
        }
      }
      return child
    })

  return {
    tagOrComponent,
    props: { ...props, children: flattenedChildren },
    children: flattenedChildren
  }
}

module.exports = createElement
