import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const element = React.createElement(App, null)
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(React.StrictMode, null, element)
)