const trim = s => s.replace(/^ +| +$/g, '')

function formatPrompt (textarea) {
    let text = textarea.value.trim()
    let endComma = text.endsWith(',')
    text = text
        .replaceAll(/ {2,}/g, ' ')
        .replaceAll(/([(<])[, ]*/g, '$1')
        .replaceAll(/[, ]*([>)])/g, '$1')
        .split('\n')
        .map(s => s
            .split(',')
            .map(trim)
            .filter(Boolean)
            .join(', ')
        ).join(',\n')
    if (endComma) {
        text += ', '
    }
    textarea.value = text
}

function setupExtraNetworksForTab(tabname) {
    let tabnav = $(`#${tabname}_extra_tabs > .tab-nav`)

    function registerPrompt(tabname, id) {
        let textarea = $(`#${id} textarea`)
        if (!activePromptTextarea[tabname]) {
            activePromptTextarea[tabname] = textarea
        }
        textarea.on('focus', function() {
            activePromptTextarea[tabname] = textarea
        })
        textarea.on('blur', () => {
            textarea.start = textarea.selectionStart
            textarea.end = textarea.selectionEnd
            formatPrompt(textarea)
            updateInput(textarea)
            textarea.setSelectionRange(textarea.start, textarea.end)
        })
    }

    $$(`#${tabname}_extra_tabs .extra-page`).forEach(function(page) {
        let search = $(`#${page.id}_search`)
        let sort_mod = $(`#${page.id}_sort`)
        let sort_dir = $(`#${page.id}_sort_dir`)

        let applyFilter = function () {
            let searchTerm = search.value.toLowerCase()
            let parent = $('.extra-network-cards', page)
            for (let card of parent.children) {
                let searchOnly = card.querySelector('.search_only')
                let text = $$('.search_terms', card).map(t => t.textContent).join(' ').toLowerCase()
                let visible = text.includes(searchTerm)
                if (searchOnly && searchTerm.length < 4) {
                    visible = false
                }
                card.hidden = visible ? '' : 1
            }
            localSet(search.id, search.value)
        }

        let applySort = function() {
            let reverse = sort_dir.dataset.sortdir == 'Descending'
            let sortKey = "sort" + sort_mod.value
            let parent = $('.extra-network-cards', page)
            let sorted = Array.from(parent.children)
            sorted.sort(function(cardA, cardB) {
                let a = cardA.dataset[sortKey]
                let b = cardB.dataset[sortKey]
                let res = isNaN(a) || isNaN(b) ? a.localeCompare(b) : a - b
                return reverse ? -res : res
            })
            let frag = document.createDocumentFragment()
            sorted.forEach(el => frag.appendChild(el))
            parent.replaceChildren(frag)
            localSet(sort_mod.id, sort_mod.value)
            localSet(sort_dir.id, sort_dir.dataset.sortdir)
        }

        search.value = localGet(search.id)
        sort_mod.value = localGet(sort_mod.id)
        sort_dir.dataset.sortdir = localGet(sort_dir.id)

        search.on("input", applyFilter);
        extraNetworksApplyFilter[page.id] = applyFilter;
        extraNetworksApplySort[page.id] = applySort;

        let controls = $('.extra-network-control', page)
        tabnav.append(controls)
        // controls.remove()

        if (page.style.display != "none") {
            extraNetworksShowControlsForPage(tabname, page.id)
        }
    })

    registerPrompt(tabname, tabname + "_prompt");
    registerPrompt(tabname, tabname + "_neg_prompt");
}

function extraNetworksMovePromptToTab(tabname, id, showPrompt, showNegativePrompt) {
    if (!$('.toprow-compact-tools')) return; // only applicable for compact prompt layout

    let promptContainer = _(tabname + '_prompt_container')
    let prompt = _(tabname + '_prompt_row')
    let negPrompt = _(tabname + '_neg_prompt_row')
    let elem = id ? _(id) : null

    if (showNegativePrompt && elem) {
        elem.insertBefore(negPrompt, elem.firstChild);
    } else {
        promptContainer.insertBefore(negPrompt, promptContainer.firstChild);
    }

    if (showPrompt && elem) {
        elem.insertBefore(prompt, elem.firstChild);
    } else {
        promptContainer.insertBefore(prompt, promptContainer.firstChild);
    }

    if (elem) {
        elem.classList.toggle('extra-page-prompts-active', showNegativePrompt || showPrompt);
    }
}


function extraNetworksShowControlsForPage(tabname, tabname_full) {
    $$(`#${tabname}_extra_tabs > .tab-nav > .extra-network-control`).forEach(function(el) {
        el.hidden = el.classList.contains(tabname_full) ? '' : '1'
    })
}


function extraNetworksUnrelatedTabSelected(tabname) { // called from python when user selects an unrelated tab (generate)
    extraNetworksMovePromptToTab(tabname, '', false, false);
    extraNetworksShowControlsForPage(tabname, null);
}

function extraNetworksTabSelected(tabname, id, showPrompt, showNegativePrompt, tabname_full) { // called from python when user selects an extra networks tab
    extraNetworksMovePromptToTab(tabname, id, showPrompt, showNegativePrompt);
    extraNetworksShowControlsForPage(tabname, tabname_full);
    applyExtraNetworkSort(tabname_full)
}

function applyExtraNetworkFilter(tabname_full, subdir) {
    if (subdir != undefined) {
        $(`#${tabname_full}_search`).value = subdir
    }
    setTimeout(extraNetworksApplyFilter[tabname_full], 1)
}

function applyExtraNetworkSort(tabname_full) {
    setTimeout(extraNetworksApplySort[tabname_full], 1)
}

let extraNetworksApplyFilter = {};
let extraNetworksApplySort = {};
let activePromptTextarea = {};

let re_extranet = /<([^:^>]+:[^:]+):[\d.]+>(.*)/
let re_extranet_g = /<([^:^>]+:[^:]+):[\d.]+>/g

let re_extranet_neg = /\(([^:^>]+:[\d.]+)\)/
let re_extranet_g_neg = /\(([^:^>]+:[\d.]+)\)/g

function tryToRemoveExtraNetworkFromPrompt(textarea, text, isNeg) {
    let m = text.match(isNeg ? re_extranet_neg : re_extranet)
    let extraTextSep = opts.extra_networks_add_text_separator
    let replaced = false
    let newValue
    if (m) {
        let extraTextAfterNet = m[2]
        let partToSearch = m[1]
        let foundPos = -1
        newValue = textarea.value.replaceAll(isNeg ? re_extranet_g_neg : re_extranet_g, function(found, net, pos) {
            m = found.match(isNeg ? re_extranet_neg : re_extranet);
            if (m[1] == partToSearch) {
                replaced = true;
                foundPos = pos;
                return "";
            }
            return found;
        });
        if (foundPos >= 0) {
            if (extraTextAfterNet && newValue.substr(foundPos, extraTextAfterNet.length) == extraTextAfterNet) {
                newValue = newValue.substr(0, foundPos) + newValue.substr(foundPos + extraTextAfterNet.length);
            }
            if (newValue.substr(foundPos - extraTextSep.length, extraTextSep.length) == extraTextSep) {
                newValue = newValue.substr(0, foundPos - extraTextSep.length) + newValue.substr(foundPos);
            }
        }
    } else {
        newValue = textarea.value.replaceAll(new RegExp(`((?:${extraTextSep})?${text})`, "g"), "");
        replaced = (newValue != textarea.value)
    }

    if (replaced) {
        textarea.value = newValue;
        return true;
    }

    return false;
}

function updatePromptArea(text, textarea, isNeg) {
    if (!tryToRemoveExtraNetworkFromPrompt(textarea, text, isNeg)) {
        let add = trim(opts.extra_networks_add_text_separator)
        textarea.value += textarea.value.endsWith(add) ? '' : add
    }

    updateInput(textarea)
}

function cardClicked(tabname, textToAdd, textToAddNegative, allowNegativePrompt) {
    let textarea = allowNegativePrompt ? activePromptTextarea[tabname] : $(`#${tabname}_prompt textarea`)
    if (textarea.start != textarea.end) {
        textarea.setRangeText(textToAdd, textarea.start, textarea.end, 'select')
        textarea.focus()
    } else if (textToAddNegative) {
        updatePromptArea(textToAdd, textarea);
        updatePromptArea(textToAddNegative, $(`#${tabname}_neg_prompt textarea`), true);
    } else {
        updatePromptArea(textToAdd, textarea);
    }
}

function saveCardPreview(event, tabname, filename) {
    let textarea = $('#' + tabname + '_preview_filename  > label > textarea')
    let button = _(tabname + '_save_preview')

    textarea.value = filename;
    updateInput(textarea);

    button.click();

    event.stopPropagation();
    event.preventDefault();
}

function extraNetworksControlSortDirOnClick(event, tabname, extra_networks_tabname) {
    let el = event.currentTarget
    if (el.dataset.sortdir == "Ascending") {
        el.dataset.sortdir = "Descending";
        el.setAttribute("title", "Sort descending");
    } else {
        el.dataset.sortdir = "Ascending";
        el.setAttribute("title", "Sort ascending");
    }
    applyExtraNetworkSort(tabname + "_" + extra_networks_tabname);
}


/**
 * Handles `onclick` events for the Refresh Page button.
 *
 * In order to actually call the python functions in `ui_extra_networks.py`
 * to refresh the page, we created an empty gradio button in that file with an
 * event handler that refreshes the page. So what this function here does
 * is it manually raises a `click` event on that button.
 *
 * @param event                     The generated event.
 * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
 * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
 */
function extraNetworksControlRefreshOnClick(event, tabname, extra_networks_tabname) {
    _(tabname + "_" + extra_networks_tabname + "_refresh_internal").dispatchEvent(new Event("click"));
}

let globalPopup, globalPopupBody

function closePopup () {
    if (!globalPopup) return
    globalPopup.style.display = 'none'
}

function popup (elem) {
    if (!globalPopup) {
        globalPopup = createEl('div', 'global-popup', {onclick: closePopup}, $('.main'))

        createEl('div', 'global-popup-close', {onclick: closePopup, title: 'Close'}, globalPopup)

        globalPopupBody = createEl('div', 'global-popup-inner', {
            onclick: e => {
                e.stopPropagation()
                return false
            }, title: 'Close'
        }, globalPopup)
    }
    globalPopupBody.innerHTML = ''
    globalPopupBody.appendChild(elem)
    globalPopup.style.display = 'flex'
}

let storedPopupIds = {}

function popupId(id) {
    if (!storedPopupIds[id]) {
        storedPopupIds[id] = _(id);
    }
    popup(storedPopupIds[id]);
}

function extraNetworksShowMetadata (textContent) {
    let elem = createEl('pre', 'popup-metadata', {textContent})
    popup(elem)
}

function requestGet (url, data, handler, errorHandler) {
    let xhr = new XMLHttpRequest()
    xhr.open('GET', url + '?' + new URLSearchParams(data), true)
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return
        if (xhr.status === 200) {
            try {
                let js = JSON.parse(xhr.responseText)
                handler(js)
            } catch (error) {
                console.error(error)
                errorHandler()
            }
        } else {
            errorHandler()
        }
    }
    xhr.send()
}

function extraNetworksCopyCardPath(event, path) {
    navigator.clipboard.writeText(path);
    event.stopPropagation();
}

function extraNetworksRequestMetadata(event, extraPage, cardName) {
    let showError = function () {
        extraNetworksShowMetadata('there was an error getting metadata')
    }

    requestGet("./sd_extra_networks/metadata", {page: extraPage, item: cardName}, function(data) {
        if (data && data.metadata) {
            extraNetworksShowMetadata(data.metadata);
        } else {
            showError();
        }
    }, showError);

    event.stopPropagation();
}

let extraPageUserMetadataEditors = {}

function extraNetworksEditUserMetadata(event, tabname, extraPage, cardName) {
    let id = tabname + '_' + extraPage + '_edit_user_metadata'

    let editor = extraPageUserMetadataEditors[id]
    if (!editor) {
        editor = {};
        editor.page = _(id);
        editor.nameTextarea = $("#" + id + "_name" + ' textarea');
        editor.button = $("#" + id + "_button");
        extraPageUserMetadataEditors[id] = editor;
    }

    editor.nameTextarea.value = cardName;
    updateInput(editor.nameTextarea);

    editor.button.click();

    popup(editor.page);

    event.stopPropagation();
}

function extraNetworksRefreshSingleCard(page, tabname, name) {
    requestGet("./sd_extra_networks/get-single-card", {page: page, tabname: tabname, name: name}, function(data) {
        if (data && data.html) {
            let card = $(`#${tabname}_${page.replace(' ', '_')}_cards > .card[data-name="${name}"]`)

            let newDiv = document.createElement('DIV')
            newDiv.innerHTML = data.html;
            let newCard = newDiv.firstElementChild

            newCard.style.display = '';
            card.parentElement.insertBefore(newCard, card);
            card.parentElement.removeChild(card);
        }
    })
}

onUiLoaded(function() {
    setupExtraNetworksForTab('txt2img')
    setupExtraNetworksForTab('img2img')
})
