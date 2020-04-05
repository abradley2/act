const render = prop(() => {
  throw new Error('Render method not specified')
})

// the activeComponentNode represents our currently rendered
// top level virtual node for a component, with an attached
// domNode containing hooks data. As we re-render and create new virtual nodes
// each time it is necessary to re-attach the domNode so hooks data isn't
// lost even though virtualNodes are re-created each render. This means hooks
// data, like state, is inherently tied to the lifetime of the component's root
// element and can be reset by things like having the parent's "key" changed
const activeComponentNode = prop()

// virtual nodes don't actually get a domNode until after their "render" function
// has finished- so we use this "cache" here to hold data for hooks until render
// is resolved at which point it can be transferred to `activeComponentNode.domNode`
const hooksCache = prop({})

// convenience function that allows the `render` module to mutate everything in
// here by wrapping values in a getter/setter closure
function prop (initialValue) {
  let value = initialValue
  return function getterSetter () {
    if (arguments.length === 0) {
      return value
    }
    value = arguments[0]
  }
}

module.exports = {
  render,
  activeComponentNode,
  hooksCache
}
