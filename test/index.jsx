/** @jsx createElement */
import { createElement, render, useState } from '../src'

window.createElement = createElement

const todos = [
  { id: Date.now().toString() + Math.random(), title: 'first todo' }
]

let newTodoTitle = ''

function Bar () {
  return <h3>
    Nested top level components can be tricky!
  </h3>
}

function Foo () {
  return <Bar />
}

function Counter () {
  const [count, setCount] = useState(2)

  return <button onclick={() => setCount(count + 1)}>
    {count}
  </button>
}

function App () {
  return <div id="appRoot" className="container">
    {/* A simple counter */}
    <Counter label="Current count:" />

    {/* A nested component */}
    <Foo />

    {/* A TODO list */}
    <h3>{newTodoTitle}</h3>
    <input
      value={newTodoTitle}
      oninput={(e) => {
        newTodoTitle = e.target.value
        redraw()
      }}
    />
    <button onclick={() => {
      todos.unshift({
        id: Date.now().toString() + Math.random(),
        title: newTodoTitle
      })
      newTodoTitle = ''
      redraw()
    }}>
      Add Todo
    </button>
    {todos.map((todo) => {
      return <h3 key={todo.id}>{todo.title}</h3>
    })}
  </div>
}

function redraw () {
  render(<App />, document.getElementById('appRoot'))
}

redraw()
