const h = require('mutant/html-element')
const MutantDict = require('mutant/dict')
const computed = require('mutant/computed')
const Sprintf = require('./sprintf')
const {htmlEscape} = require('escape-goat')
const styles = require('module-styles')('tre-console-messages')

module.exports = function(opts) {
  opts = opts || {}
  const filter = opts.filter || (x=>true)

  const sprintf = Sprintf({
    parseCSS,
    stringify,
    escape: htmlEscape
  })

  return function render() {
    const container = h('.container')
    const counts = {}
    const countsObs = new MutantDict()

    window.addEventListener('console-message', msg =>{
      const {text, type, values, location} = msg.detail
      if (!filter({text, type, location})) return
      const n = (counts[type] || 0) + 1
      counts[type] = n
      countsObs.set(counts)
      if (!values.length) values.push(text)
      let s, err
      try {
        s = sprintf.apply(null, values)
        s = s.replace(/(?!^)<span/g, '</span><span')
        if (/<span/.test(s)) s += '</span>'
      } catch(e) {
        err = e
        //const m = values.map(stringify).join(' ')
        m = htmlEscape(values[0])
        s = `error formatting console message: "${m}": ${htmlEscape(err.message)}\n` + location 
      }
      container.appendChild(h(`.console-message.${err ? 'error' : type}`, {innerHTML: s}))
    })

    return h('details.tre-console-messages', [
      h('summary.counts', computed(countsObs, renderCounts)),
      h('.scrollview', [
        container
      ])
    ])

    function renderCounts(counts) {
      const ret = Object.keys(counts).map(type=>{
        return h(`span.${type}.count`, counts[type])
      })
      ret.unshift(h(`.text.${Object.keys(counts).join('.')}`))
      return ret
    }
  }
}

function parseCSS(css) {
  return `<span style="${htmlEscape(css)}">`
}

function stringify(x) {
  if (x == undefined) return 'undefined'
  if (x == null) return 'null'
  if (typeof x =='number') return `${x}`
  if (typeof x =='string') return `${x}`
  if (typeof x =='boolean') return `${x}`
  const type = typeof x
  let s = `[${type}]`
  try {
    s = htmlEscape(JSON.stringify(x, null, 2))
  } catch(e) {
    s = x.toString()
  }
  return `<details class="${type}"><summary>${type}</summary><pre>${s}</pre></details>`
}

styles(`
  .tre-console-messages .scrollview {
    overflow-y: scroll;
    background-color: #222;
  }
  .tre-console-messages .counts span {
    margin-right: .5em;
  }
  .tre-console-messages .counts span::before {
    padding: 3px;
  }
  .tre-console-messages .error.count::before {
    content: '✖';
    color: red;
  }
  .tre-console-messages .info.count::before {
    content: 'ℹ';
    color: blue;
  }
  .tre-console-messages .warning.count::before {
    content: '⚠';
    color: yellow;
  }
  .tre-console-messages .network-error.count::before {
    content: 'network';
    color: purple;
  }
  .tre-console-messages .log.count {
    display: none;
  }
  .tre-console-messages .console-message {
    font-family: monospace;
    padding: 1px;
    border: 1px solid #222;
    border-top-color: #121212;
    border-left: none;
    border-right: none;
  }
  .tre-console-messages .console-message.warning {
    background-color: #9a9a0dd9;
    color: #221;
    border-color: yellow;
  }
  .tre-console-messages .console-message.error {
    background-color: #5f1818de;
    color: #efee;
    border-color: red;
  }
  .tre-console-messages .console-message.network-error {
    background-color: #5f1818de;
    color: #efee;
    border-color: purple;
  }
  .tre-console-messages .console-message.info {
    background-color: #0c0c9cd1;
    color: #112;
    border-color: blue;
  }
`)
