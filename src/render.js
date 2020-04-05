const hooks = require('./hooks')

// rather than pre-define a very large list of event handlers
// let's just populate this as we go by recording which property names are paired
// with values that are functions.
const eventHandlers = []

// this will be a list of "props" on dom nodes that we need to set directly as a property
// on the element rather than through "setAttribute". We'll refer to this when diffing
// props of the virtualNode against the domNode
const domProperties = ['id', 'className', 'checked', 'value', 'innerText', 'innerHTML']

function useState (initial) {
  Object.assign(hooks.hooksCache(), {
    state: initial
  })

  const virtualNode = hooks.activeComponentNode()

  function setState (nextValue) {
    hooks.activeComponentNode(virtualNode)

    virtualNode.domNode.__hooksCache.state = nextValue
    render(
      virtualNode.tagOrComponent(virtualNode.props),
      virtualNode.domNode,
      virtualNode.tagOrComponent
    )
  }

  if (virtualNode.domNode) {
    return [
      hooks.activeComponentNode().domNode.__hooksCache.state,
      setState
    ]
  }
  return [
    initial,
    setState
  ]
}

function render (virtualNode, domNode, activeComponent) {
  const {
    tagOrComponent,
    props,
    children,
    text
  } = virtualNode

  virtualNode.domNode = domNode

  // let's handle components!
  if (tagOrComponent.constructor === Function) {
    // check if we're at a new root component for our render tree
    if (tagOrComponent !== (hooks.activeComponentNode() && hooks.activeComponentNode().tagOrComponent)) {
      hooks.hooksCache({})
      hooks.activeComponentNode(virtualNode)
    }

    const componentNode = tagOrComponent(props, virtualNode)
    if (!domNode) {
      // we don't have a dom node and it's a component, we need to render and
      // return the vdom of the component to the parent cycle of this render
      // function so it can mount it
      return componentNode
    }
    render(componentNode, domNode, tagOrComponent)
    return
  }

  const tag = tagOrComponent

  // it's a text node! these are easy to handle
  if (!domNode.tagName) {
    if (text !== domNode.textContent) {
      domNode.textContent = text
    }
    return
  }

  // if the tag has changed we need an entirely new element
  if (tag !== domNode.tagName.toLowerCase()) {
    const newDomNode = document.createElement(tag)
    domNode.parentNode.replaceChild(newDomNode, domNode)
    render(virtualNode, newDomNode, activeComponent)
    return
  }

  // now we need to diff/set props to attributes. This is pretty easy
  Object.keys(props).forEach((propName) => {
    const propValue = props[propName]

    // skip children
    if (propName === 'children') {
      return
    }

    // add event handlers directly to the domNode
    if (typeof propValue === 'function') {
      if (!eventHandlers.includes(propName)) {
        eventHandlers.push(propName)
      }
      domNode[propName] = propValue
      return
    }

    // handle id and className as special cases, everything else
    // is just set attribute from here
    switch (domProperties.includes(propName)) {
      case true:
        domNode[propName] = propValue
        break
      default:
        domNode.setAttribute(propName, propValue)
    }
  })

  // if there are attributes in the domNode that are no longer in props
  // those need to be unset
  if (domNode.hasAttributes()) {
    for (let i = 0; i < domNode.attributes.length; i++) {
      const { name: attrName, value: attrValue } = domNode.attributes[i]

      // class- a pain in the ass
      if (attrName === 'class') {
        if (!props.className && domNode.className) {
          domNode.className = ''
          continue
        }
      }

      if (domProperties.includes(attrName)) {
        if (!props[attrName] && domNode[attrName]) {
          domNode[attrName] = undefined
          continue
        }
      }

      if (typeof props[attrName] === 'undefined' && attrValue) {
        domNode.removeAttribute(attrName)
      }
    }
  }

  // handle event handlers
  eventHandlers.forEach((handlerName) => {
    if (!props[handlerName] && domNode[handlerName]) {
      domNode[handlerName] = undefined
    }
  })

  // add and edit children as needed
  children.forEach((virtualChild, idx) => {
    let domSibling = domNode.childNodes[idx]
    const nextSibling = domNode.childNodes[idx + 1]

    if (!virtualChild) {
      return
    }

    // first let's check if children has been "re-arranged"
    // and if we can use the "key" optimization
    let childMoved = false
    if (virtualChild.props.key) {
      // check if there's a key match
      domSibling = [...domNode.childNodes].find((node, searchIdx) => {
        const match = node.getAttribute('key') === virtualChild.props.key
        if (match && idx !== searchIdx) {
          childMoved = true
        }
        return match
      }) || domSibling
    }

    // handle child move using cached keyed dom node
    if (childMoved) {
      domNode.removeChild(domSibling)
      // we need to re-compute this as the previous nextSibling
      // could be the key-match which we have just removed
      const newNextSibling = domNode.childNodes[idx + 1]
      if (newNextSibling) {
        domNode.insertBefore(domSibling, nextSibling)
      } else {
        domNode.appendChild(domSibling)
      }
    }

    // handle no matching host node
    if (!domSibling && virtualChild.tagOrComponent.constructor === String) {
      domSibling = virtualChild.tagOrComponent === 'TEXT_NODE'
        ? document.createTextNode(virtualChild.children[0])
        : document.createElement(virtualChild.tagOrComponent)
      if (nextSibling) {
        domNode.insertBefore(domSibling, nextSibling)
      } else {
        domNode.appendChild(domSibling)
      }
    }

    // now that it is guaranteed to have found a real dom node sibling match
    // each virtual child node can go through it's own render
    let result = render(virtualChild, domSibling)

    while (result) {
      if (result.tagOrComponent.constructor === String) {
        const hostEl = document.createElement(result.tagOrComponent)
        hostEl.__hooksCache = hooks.hooksCache()

        Object.assign(
          hooks.activeComponentNode(),
          { domNode: hostEl }
        )

        domNode.appendChild(hostEl)
        render(result, hostEl, activeComponent)
        result = undefined
        continue
      }

      // we're at a new component in the heirarchy so we need to reset active component
      hooks.activeComponentNode(undefined)
      hooks.hooksCache({})
      result = render(result, domSibling, activeComponent)
    }
  })

  hooks.activeComponentNode(undefined)
  hooks.hooksCache({})
}

// we need to pass the render function to our hooks modules so hooks may invoke it
hooks.render(render)

module.exports = {
  render,
  useState
}
