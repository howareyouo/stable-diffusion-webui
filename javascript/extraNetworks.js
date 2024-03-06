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

function registerPrompt(tabname, id) {
    let textarea = $(`#${id} textarea`)

    if (!activePromptTextarea[tabname]) {
        activePromptTextarea[tabname] = textarea
    }

    textarea.on('focus', function() {
        activePromptTextarea[tabname] = textarea
    });

    textarea.on('blur', () => {
        textarea.start = textarea.selectionStart
        textarea.end = textarea.selectionEnd

        formatPrompt(textarea)
        updateInput(textarea)

        textarea.setSelectionRange(textarea.start, textarea.end)
    })
}

function setupExtraNetworksForTab(tabname) {
    let tabnav = $('#' + tabname + '_extra_tabs > div.tab-nav')
    let controlsDiv = createEl('DIV', 'extra-networks-controls-div', '', tabnav);

    $$(`#${tabname}_extra_tabs .extra-page`).forEach(function(page) {
        let search = $('#' + page.id + '_extra_search')
        let sort_mode = $('#' + page.id + '_extra_sort')
        let sort_dir = $('#' + page.id + '_extra_sort_dir')
        let refresh = $('#' + page.id + '_extra_refresh')

        // If any of the buttons above don't exist, we want to skip this iteration of the loop.
        if (!search || !sort_mode || !sort_dir || !refresh) {
            return // `return` is equivalent of `continue` but for forEach loops.
        }

        let applyFilter = function (force) {
            let searchTerm = search.value.toLowerCase()
            $$('#' + tabname + '_extra_tabs div.card').forEach(function (elem) {
                let searchOnly = elem.querySelector('.search_only')
                let text = Array.prototype.map.call(elem.querySelectorAll('.search_terms'), function (t) {
                    return t.textContent.toLowerCase()
                }).join(' ')

                let visible = text.indexOf(searchTerm) != -1
                if (searchOnly && searchTerm.length < 4) {
                    visible = false
                }
                elem.style.display = visible ? '' : 'none'
            })

            applySort(force)
        }

        let applySort = function(force) {
            let parent = $('.extra-network-cards', page)
            let cards = parent.children
            let reverse = sort_dir.dataset.sortdir == 'Descending'
            let sortKey = sort_mode.dataset.sortmode.toLowerCase().replace('sort', '').replaceAll(' ', '_').replace(/_+$/, '').trim() || 'name'
            sortKey = "sort" + sortKey.charAt(0).toUpperCase() + sortKey.slice(1);
            let sortKeyStore = sortKey + '-' + (reverse ? 'Descending' : 'Ascending') + '-' + cards.length

            if (sortKeyStore == sort_mode.dataset.sortkey && !force) {
                return
            }
            sort_mode.dataset.sortkey = sortKeyStore;

            let sorted = Array.from(cards)
            sorted.sort(function(cardA, cardB) {
                let a = cardA.dataset[sortKey]
                let b = cardB.dataset[sortKey]
                let res
                if (isNaN(a) || isNaN(b))
                    res = a.localeCompare(b)
                else
                    res = a - b
                return reverse ? -res : res
            })

            let frag = document.createDocumentFragment()
            sorted.forEach(el => frag.appendChild(el))
            parent.replaceChildren(frag)
        };

        search.addEventListener("input", applyFilter);
        applySort();
        applyFilter();
        extraNetworksApplySort[page.id] = applySort;
        extraNetworksApplyFilter[page.id] = applyFilter;

        controlsDiv.appendChild($(`#${page.id}_controls`))

        if (page.style.display != "none") {
            extraNetworksShowControlsForPage(tabname, page.id)
        }
    });

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
    $$('#' + tabname + '_extra_tabs .extra-networks-controls-div > div').forEach(function(elem) {
        let targetId = tabname_full + '_controls'
        elem.style.display = elem.id == targetId ? "" : "none";
    });
}


function extraNetworksUnrelatedTabSelected(tabname) { // called from python when user selects an unrelated tab (generate)
    extraNetworksMovePromptToTab(tabname, '', false, false);
    extraNetworksShowControlsForPage(tabname, null);
}

function extraNetworksTabSelected(tabname, id, showPrompt, showNegativePrompt, tabname_full) { // called from python when user selects an extra networks tab
    extraNetworksMovePromptToTab(tabname, id, showPrompt, showNegativePrompt);
    extraNetworksShowControlsForPage(tabname, tabname_full);
}

function applyExtraNetworkFilter(tabname_full) {
    let doFilter = function () {
        let applyFunction = extraNetworksApplyFilter[tabname_full]

        if (applyFunction) {
            applyFunction(true)
        }
    }
    setTimeout(doFilter, 1);
}

function applyExtraNetworkSort(tabname_full) {
    setTimeout(() => extraNetworksApplySort[tabname_full](true), 1);
}

let extraNetworksApplyFilter = {};
let extraNetworksApplySort = {};
let activePromptTextarea = {};

function setupExtraNetworks() {
    setupExtraNetworksForTab('txt2img');
    setupExtraNetworksForTab('img2img');
}

let re_extranet = /<([^:^>]+:[^:]+):[\d.]+>(.*)/
let re_extranet_g = /<([^:^>]+:[^:]+):[\d.]+>/g

let re_extranet_neg = /\(([^:^>]+:[\d.]+)\)/
let re_extranet_g_neg = /\(([^:^>]+:[\d.]+)\)/g

function tryToRemoveExtraNetworkFromPrompt(textarea, text, isNeg) {
    let m = text.match(isNeg ? re_extranet_neg : re_extranet)
    let replaced = false
    let newTextareaText
    let extraTextSeparator = opts.extra_networks_add_text_separator
    if (m) {
        let extraTextAfterNet = m[2]
        let partToSearch = m[1]
        let foundAtPosition = -1
        newTextareaText = textarea.value.replaceAll(isNeg ? re_extranet_g_neg : re_extranet_g, function(found, net, pos) {
            m = found.match(isNeg ? re_extranet_neg : re_extranet);
            if (m[1] == partToSearch) {
                replaced = true;
                foundAtPosition = pos;
                return "";
            }
            return found;
        });
        if (foundAtPosition >= 0) {
            if (extraTextAfterNet && newTextareaText.substr(foundAtPosition, extraTextAfterNet.length) == extraTextAfterNet) {
                newTextareaText = newTextareaText.substr(0, foundAtPosition) + newTextareaText.substr(foundAtPosition + extraTextAfterNet.length);
            }
            if (newTextareaText.substr(foundAtPosition - extraTextSeparator.length, extraTextSeparator.length) == extraTextSeparator) {
                newTextareaText = newTextareaText.substr(0, foundAtPosition - extraTextSeparator.length) + newTextareaText.substr(foundAtPosition);
            }
        }
    } else {
        newTextareaText = textarea.value.replaceAll(new RegExp(`((?:${extraTextSeparator})?${text})`, "g"), "");
        replaced = (newTextareaText != textarea.value);
    }

    if (replaced) {
        textarea.value = newTextareaText;
        return true;
    }

    return false;
}

function updatePromptArea(text, textarea, isNeg) {
    if (!tryToRemoveExtraNetworkFromPrompt(textarea, text, isNeg)) {
        textarea.value = textarea.value + opts.extra_networks_add_text_separator + text
    }

    updateInput(textarea);
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

function extraNetworksTreeProcessFileClick(event, btn, tabname, extra_networks_tabname) {
    /**
     * Processes `onclick` events when user clicks on files in tree.
     *
     * @param event                     The generated event.
     * @param btn                       The clicked `tree-list-item` button.
     * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
     * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
     */
    // NOTE: Currently unused.
    return;
}

function extraNetworksTreeProcessDirectoryClick(event, btn, tabname, extra_networks_tabname) {
    /**
     * Processes `onclick` events when user clicks on directories in tree.
     *
     * Here is how the tree reacts to clicks for various states:
     * unselected unopened directory: Diretory is selected and expanded.
     * unselected opened directory: Directory is selected.
     * selected opened directory: Directory is collapsed and deselected.
     * chevron is clicked: Directory is expanded or collapsed. Selected state unchanged.
     *
     * @param event                     The generated event.
     * @param btn                       The clicked `tree-list-item` button.
     * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
     * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
     */
    let ul = btn.nextElementSibling
    // This is the actual target that the user clicked on within the target button.
    // We use this to detect if the chevron was clicked.
    let true_targ = event.target

    function _expand_or_collapse(_ul, _btn) {
        // Expands <ul> if it is collapsed, collapses otherwise. Updates button attributes.
        if (_ul.hasAttribute("hidden")) {
            _ul.removeAttribute("hidden");
            _btn.dataset.expanded = "";
        } else {
            _ul.setAttribute("hidden", "");
            delete _btn.dataset.expanded;
        }
    }

    function _remove_selected_from_all() {
        // Removes the `selected` attribute from all buttons.
        $$('div.tree-list-content').forEach(el => {
            delete el.dataset.selected;
        });
    }

    function _select_button(_btn) {
        // Removes `data-selected` attribute from all buttons then adds to passed button.
        _remove_selected_from_all();
        _btn.dataset.selected = "";
    }

    function _update_search(_tabname, _extra_networks_tabname, _search_text) {
        // Update search input with select button's path.
        let search_input_elem = $('#' + tabname + '_' + extra_networks_tabname + '_extra_search')
        search_input_elem.value = _search_text;
        updateInput(search_input_elem);
    }


    // If user clicks on the chevron, then we do not select the folder.
    if (true_targ.matches(".tree-list-item-action--leading, .tree-list-item-action-chevron")) {
        _expand_or_collapse(ul, btn);
    } else {
        // User clicked anywhere else on the button.
        if ("selected" in btn.dataset && !(ul.hasAttribute("hidden"))) {
            // If folder is select and open, collapse and deselect button.
            _expand_or_collapse(ul, btn);
            delete btn.dataset.selected;
            _update_search(tabname, extra_networks_tabname, "");
        } else if (!(!("selected" in btn.dataset) && !(ul.hasAttribute("hidden")))) {
            // If folder is open and not selected, then we don't collapse; just select.
            // NOTE: Double inversion sucks but it is the clearest way to show the branching here.
            _expand_or_collapse(ul, btn);
            _select_button(btn, tabname, extra_networks_tabname);
            _update_search(tabname, extra_networks_tabname, btn.dataset.path);
        } else {
            // All other cases, just select the button.
            _select_button(btn, tabname, extra_networks_tabname);
            _update_search(tabname, extra_networks_tabname, btn.dataset.path);
        }
    }
}

function extraNetworksTreeOnClick(event, tabname, extra_networks_tabname) {
    /**
     * Handles `onclick` events for buttons within an `extra-network-tree .tree-list--tree`.
     *
     * Determines whether the clicked button in the tree is for a file entry or a directory
     * then calls the appropriate function.
     *
     * @param event                     The generated event.
     * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
     * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
     */
    let btn = event.currentTarget
    let par = btn.parentElement
    if (par.dataset.treeEntryType === "file") {
        extraNetworksTreeProcessFileClick(event, btn, tabname, extra_networks_tabname);
    } else {
        extraNetworksTreeProcessDirectoryClick(event, btn, tabname, extra_networks_tabname);
    }
}

function extraNetworksControlSortOnClick(event, tabname, extra_networks_tabname) {
    /**
     * Handles `onclick` events for the Sort Mode button.
     *
     * Modifies the data attributes of the Sort Mode button to cycle between
     * various sorting modes.
     *
     * @param event                     The generated event.
     * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
     * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
     */
    let curr_mode = event.currentTarget.dataset.sortmode
    let el_sort_dir = $('#' + tabname + '_' + extra_networks_tabname + '_extra_sort_dir')
    let sort_dir = el_sort_dir.dataset.sortdir
    if (curr_mode == "path") {
        event.currentTarget.dataset.sortmode = "name";
        event.currentTarget.dataset.sortkey = "sortName-" + sort_dir + "-640";
        event.currentTarget.setAttribute("title", "Sort by filename");
    } else if (curr_mode == "name") {
        event.currentTarget.dataset.sortmode = "created";
        event.currentTarget.dataset.sortkey = "sort-created-" + sort_dir + "-640";
        event.currentTarget.setAttribute("title", "Sort by date created");
    } else if (curr_mode == "created") {
        event.currentTarget.dataset.sortmode = "modified";
        event.currentTarget.dataset.sortkey = "sort-modified-" + sort_dir + "-640";
        event.currentTarget.setAttribute("title", "Sort by date modified");
    } else {
        event.currentTarget.dataset.sortmode = "path";
        event.currentTarget.dataset.sortkey = "sortPath-" + sort_dir + "-640";
        event.currentTarget.setAttribute("title", "Sort by path");
    }
    applyExtraNetworkSort(tabname + "_" + extra_networks_tabname);
}

function extraNetworksControlSortDirOnClick(event, tabname, extra_networks_tabname) {
    /**
     * Handles `onclick` events for the Sort Direction button.
     *
     * Modifies the data attributes of the Sort Direction button to cycle between
     * ascending and descending sort directions.
     *
     * @param event                     The generated event.
     * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
     * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
     */
    if (event.currentTarget.dataset.sortdir == "Ascending") {
        event.currentTarget.dataset.sortdir = "Descending";
        event.currentTarget.setAttribute("title", "Sort descending");
    } else {
        event.currentTarget.dataset.sortdir = "Ascending";
        event.currentTarget.setAttribute("title", "Sort ascending");
    }
    applyExtraNetworkSort(tabname + "_" + extra_networks_tabname);
}

function extraNetworksControlTreeViewOnClick(event, tabname, extra_networks_tabname) {
    /**
     * Handles `onclick` events for the Tree View button.
     *
     * Toggles the tree view in the extra networks pane.
     *
     * @param event                     The generated event.
     * @param tabname                   The name of the active tab in the sd webui. Ex: txt2img, img2img, etc.
     * @param extra_networks_tabname    The id of the active extraNetworks tab. Ex: lora, checkpoints, etc.
     */
    _(tabname + "_" + extra_networks_tabname + "_tree").classList.toggle("hidden");
    event.currentTarget.classList.toggle("extra-network-control--enabled");
}

function extraNetworksControlRefreshOnClick(event, tabname, extra_networks_tabname) {
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
    _(tabname + "_" + extra_networks_tabname + "_extra_refresh_internal").dispatchEvent(new Event("click"));
}

let globalPopup = null
let globalPopupInner = null

function closePopup() {
    if (!globalPopup) return;
    globalPopup.style.display = "none";
}

function popup(contents) {
    if (!globalPopup) {
        globalPopup = document.createElement('div');
        globalPopup.classList.add('global-popup');

        let close = document.createElement('div')
        close.classList.add('global-popup-close');
        close.addEventListener("click", closePopup);
        close.title = "Close";
        globalPopup.appendChild(close);

        globalPopupInner = document.createElement('div');
        globalPopupInner.classList.add('global-popup-inner');
        globalPopup.appendChild(globalPopupInner);

        $('.main').appendChild(globalPopup);
    }

    globalPopupInner.innerHTML = '';
    globalPopupInner.appendChild(contents);

    globalPopup.style.display = "flex";
}

let storedPopupIds = {}

function popupId(id) {
    if (!storedPopupIds[id]) {
        storedPopupIds[id] = _(id);
    }

    popup(storedPopupIds[id]);
}

function extraNetworksShowMetadata(text) {
    let elem = document.createElement('pre')
    elem.classList.add('popup-metadata');
    elem.textContent = text;

    popup(elem);
}

function requestGet(url, data, handler, errorHandler) {
    let xhr = new XMLHttpRequest()
    let args = Object.keys(data).map(function (k) {
        return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
    }).join('&')
    xhr.open("GET", url + "?" + args, true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    let js = JSON.parse(xhr.responseText)
                    handler(js);
                } catch (error) {
                    console.error(error);
                    errorHandler();
                }
            } else {
                errorHandler();
            }
        }
    };
    let js = JSON.stringify(data);
    xhr.send(js);
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
    });
}

window.addEventListener("keydown", function(event) {
    if (event.key == "Escape") {
        closePopup();
    }
});

/**
 * Setup custom loading for this script.
 * We need to wait for all of our HTML to be generated in the extra networks tabs
 * before we can actually run the `setupExtraNetworks` function.
 * The `onUiLoaded` function actually runs before all of our extra network tabs are
 * finished generating. Thus we needed this new method.
 *
 */
let uiAfterScriptsCallbacks = []
let uiAfterScriptsTimeout = null
let executedAfterScripts = false

function scheduleAfterScriptsCallbacks() {
    clearTimeout(uiAfterScriptsTimeout);
    uiAfterScriptsTimeout = setTimeout(function() {
        executeCallbacks(uiAfterScriptsCallbacks);
    }, 200);
}

onUiLoaded(function() {
    let mutationObserver = new MutationObserver(function (m) {
        let existingSearchfields = $$('[id$=\'_extra_search\']').length
        let neededSearchfields = $$('[id$=\'_extra_tabs\'] > .tab-nav > button').length - 2

        if (!executedAfterScripts && existingSearchfields >= neededSearchfields) {
            mutationObserver.disconnect()
            executedAfterScripts = true
            scheduleAfterScriptsCallbacks()
        }
    })
    mutationObserver.observe(gradioApp(), {childList: true, subtree: true});
});

uiAfterScriptsCallbacks.push(setupExtraNetworks);
