const eventHandlers = []

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
    const componentNode = tagOrComponent(props, virtualNode)
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
    switch (propName) {
      case 'className':
        domNode.className = propValue
        return
      case 'id':
        domNode.id = propValue
        return
      case 'innerText':
        domNode.innerText = propValue
        return
      default:
        domNode.setAttribute(propName, propValue)
    }
  })

  // if there are attributes in the domNode that are no longer in props
  // those need to be unset
  if (domNode.hasAttributes()) {
    for (let i = 0; i < domNode.attributes.length; i++) {
      const { name: attrName, value: attrValue } = domNode.attributes[i]

      // once again handle the special cases of id and class
      if (attrName === 'class') {
        if (!props.className && domNode.className) {
          domNode.className = ''
          continue
        }
      }

      if (attrName === 'id') {
        if (!props.id && domNode.id) {
          domNode.id = ''
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

    if (virtualChild) {
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
    }

    // now that it is guaranteed to have found a real dom node sibling match
    // each virtual child node can go through it's own render
    render(virtualChild, domSibling)
  })
}

module.exports = render
