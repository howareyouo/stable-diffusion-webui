let gradioApp = () => document
let _ = id => document.getElementById(id)
let $ = (selector, node = document) => node.querySelector(':scope ' + selector)
let $$ = (selector, node = document) => [...node.querySelectorAll(':scope ' + selector)]
HTMLElement.prototype.all = HTMLElement.prototype.querySelectorAll
HTMLElement.prototype.one = HTMLElement.prototype.querySelector
EventTarget.prototype.on = EventTarget.prototype.addEventListener
String.prototype.splice = function (start, rem, add) {
    return this.slice(0, start) + add + this.slice(start + Math.abs(rem))
}

function debounce(func, timeout = 150) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => func.apply(this, args), timeout)
    }
}

/**
 * Get the currently selected top-level UI tab button (e.g. the button that says "Extras").
 */
function get_uiCurrentTab() {
    return $('#tabs > .tab-nav .selected')
}

/**
 * Get the first currently visible top-level UI tab content (e.g. the div hosting the "txt2img" UI).
 */
function get_uiCurrentTabContent() {
    return $('#tabs > .tabitem[style$="block;"]')
}

var uiUpdateCallbacks = [];
var uiAfterUpdateCallbacks = [];
var uiLoadedCallbacks = [];
var uiTabChangeCallbacks = [];
var optionsChangedCallbacks = [];
var optionsAvailableCallbacks = [];
var uiAfterUpdateTimeout = null;
var uiCurrentTab = null;

/**
 * Register callback to be called at each UI update.
 * The callback receives an array of MutationRecords as an argument.
 */
function onUiUpdate(callback) {
    uiUpdateCallbacks.push(callback);
}

/**
 * Register callback to be called soon after UI updates.
 * The callback receives no arguments.
 *
 * This is preferred over `onUiUpdate` if you don't need
 * access to the MutationRecords, as your function will
 * not be called quite as often.
 */
function onAfterUiUpdate(callback) {
    uiAfterUpdateCallbacks.push(callback);
}

/**
 * Register callback to be called when the UI is loaded.
 * The callback receives no arguments.
 */
function onUiLoaded(callback) {
    uiLoadedCallbacks.push(callback);
}

/**
 * Register callback to be called when the UI tab is changed.
 * The callback receives no arguments.
 */
function onUiTabChange(callback) {
    uiTabChangeCallbacks.push(callback);
}

/**
 * Register callback to be called when the options are changed.
 * The callback receives no arguments.
 * @param callback
 */
function onOptionsChanged(callback) {
    optionsChangedCallbacks.push(callback);
}

/**
 * Register callback to be called when the options (in opts global variable) are available.
 * The callback receives no arguments.
 * If you register the callback after the options are available, it's just immediately called.
 */
function onOptionsAvailable(callback) {
    if (Object.keys(opts).length != 0) {
        callback();
        return;
    }

    optionsAvailableCallbacks.push(callback);
}

function executeCallbacks(queue, arg) {
    for (let callback of queue) {
        try {
            callback(arg);
        } catch (e) {
            console.error("error running callback", callback, ":", e);
        }
    }
}

/**
 * Schedule the execution of the callbacks registered with onAfterUiUpdate.
 * The callbacks are executed after a short while, unless another call to this function
 * is made before that time. IOW, the callbacks are executed only once, even
 * when there are multiple mutations observed.
 */
function scheduleAfterUiUpdateCallbacks() {
    clearTimeout(uiAfterUpdateTimeout);
    uiAfterUpdateTimeout = setTimeout(function() {
        executeCallbacks(uiAfterUpdateCallbacks)
    }, 200);
}

function gradioAppLoaded() {
    executeCallbacks(uiLoadedCallbacks)
}

document.on("DOMContentLoaded", function() {
    let mutationObserver = new MutationObserver(function (m) {
        executeCallbacks(uiUpdateCallbacks, m)
        scheduleAfterUiUpdateCallbacks()
        let newTab = get_uiCurrentTab()?.innerText
        if (newTab && (newTab !== uiCurrentTab)) {
            uiCurrentTab = newTab
            executeCallbacks(uiTabChangeCallbacks)
        }
    })
    mutationObserver.observe(gradioApp(), {childList: true, subtree: true});
});

/**
 * checks that a UI element is not in another hidden element or tab content
 */
function uiElementIsVisible(el) {
    if (el === document) {
        return true
    }

    let isVisible = getComputedStyle(el).display !== 'none'

    if (!isVisible) return false
    return uiElementIsVisible(el.parentNode)
}

function uiElementInSight(el) {
    let clRect = el.getBoundingClientRect();
    return clRect.bottom > 0 && clRect.top < window.innerHeight;
}

function elementIndex(element) {
    return [].indexOf.call(element.parentElement.children, element)
}

function createElement(tag, clazz, attrs, parent) {
    let el = document.createElement(tag)
    clazz && (el.className = clazz)
    if (attrs) {
        if (attrs instanceof Element) {
            if (!parent) parent = attrs
        } else {
            for (let k in attrs) {
                if (k.startsWith('on')) {
                    let handler = attrs[k]
                    if (typeof handler == 'string')
                        el.setAttribute(k, handler)
                    else
                        el[k] = handler
                } else
                    el[k] = attrs[k]
            }
        }
    }
    parent && parent.append(el)
    return el
}

function createElementFromHtml(html) {
    html = html.trim()
    if (!html) return null

    let result = createElement('template', '', {innerHTML: html}).content.children

    // Then return either an HTMLElement or HTMLCollection,
    // based on whether the input HTML had one or more roots.
    return result.length === 1 ? result[0] : result
  }

function doGenerate(e) {
    _(uiCurrentTab + '_generate')?.click()
    if (e) {
        e.stopPropagation()
        e.cancelable && e.preventDefault()
    }
}

function generationInfo(tab, key) {
    let el = $(`#generation_info_${tab} textarea`)
    if (el.value) {
        let o = JSON.parse(el.value)
        return key ? o[key] : o
    }
    return ''
}

function toggleSeed(reuse) {
    let input = $(`#${uiCurrentTab}_seed input`)
    let seed = -1
    if (reuse == undefined && input.value == -1) {
        seed = generationInfo(uiCurrentTab, 'seed')
    } else if (reuse) {
        seed = input.value
        if (seed == -1) {
            seed = generationInfo(uiCurrentTab, 'seed')
        }
    }
    updateInput(input, seed)
}

function toggleHr(enable) {
    let input = $(`#${uiCurrentTab}_hr-checkbox input`)
    enable = enable == undefined ? !input.checked : enable
    input.checked = enable
    updateInput(input)
}

function isEditable(el) {
    return el.isContentEditable || el.tagName == 'TEXTAREA' ||
        (el.tagName == 'INPUT' && ['text', 'number', 'search'].includes(el.type))
}

/**
 * Add a ctrl+enter as a shortcut to start a generation
 */
on('keydown', e => {
    let el = e.target
    let imgtab = uiCurrentTab?.endsWith('2img')
    let editable = isEditable(el)
    let genable = imgtab && !editable && !e.ctrlKey
    if (e.altKey) e.preventDefault()
    switch (e.code) {
        case 'Space':
            if (editable) return
        case 'Tab':
            e.preventDefault()
            toggleModal()
            break
        case 'KeyR':
            genable && toggleSeed()
            break
        case 'KeyF':
            genable && toggleHr()
            break
        case 'KeyG':
            genable && toggleHr(1)
        case 'KeyC':
            genable && toggleSeed(1)
        case 'KeyZ':
        case 'KeyX':
            if (genable) {
                if (e.altKey || e.code == 'KeyZ') {
                    toggleSeed(0)
                    toggleHr(0)
                }
                doGenerate(e)
            }
            break
        case 'Enter':
            if (e.metaKey || e.ctrlKey || e.altKey) {
                doGenerate(e)
            }
            break
        case 'Backquote':
        case 'ShiftRight':
            imgtab && doGenerate(e)
            break
        default:
            if (!editable && !isNaN(e.key) && !e.ctrlKey) {
                let tab = (imgtab ? `#${uiCurrentTab}_extra_tabs` : '#tabs') + `>.tab-nav>button:nth-child(${e.key})`
                $(tab)?.click()
            }
    }
}, true)

on("auxclick", e => {
    switch (e.button) {
        case 3:
            doGenerate(e)
            break
        case 4:
            toggleModal()
    }
}, true)

on('wheel', e => {
    if (e.target.id == 'modalImage') {
        toggleSeed(e.deltaY < 0)
        doGenerate(e)
    }
}, {passive: false})