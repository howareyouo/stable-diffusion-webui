
function localSet(k, v) {
    localStorage.setItem(k, v)
}

function localGet(k, def = '') {
    let v = localStorage.getItem(k)
    if (v === null) v = def
    return v
}

function localRemove(k) {
    return localStorage.removeItem(k)
}
