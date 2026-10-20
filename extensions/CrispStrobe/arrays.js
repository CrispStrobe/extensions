// Name: Arrays & Vectors
// ID: arrays
// Description: Advanced manipulation of arrays, vectors, and tensors.
// By: CrispStrobe <https://github.com/CrispStrobe>
// License: MPL-2.0
(function (Scratch) {
  "use strict";

  // ============================================================================
  // INTERNATIONALIZATION (i18n)
  //
  // Same module-level locale pattern as ev3dev_py_transpile.js and
  // planetemaths.js: detect once at gallery-load time, listen for changes,
  // resolve block text via the module-level t(key) at every getInfo() call.
  // ============================================================================

  const translations = {
    en: {
      "arrays.showTable": "show table [NAME] at x [X] y [Y]",
      "arrays.hideTable": "hide table [NAME]",
      "arrays.setTableTitle": "set table [NAME] title to [TITLE]",
      "arrays.setTableStyle":
        "set table [NAME] cell [W] by [H] text size [SIZE]",
      "arrays.markCell": "mark [NAME] row [ROW] col [COL]",
      "arrays.unmarkCell": "unmark [NAME] row [ROW] col [COL]",
      "arrays.clearMarks": "clear all marks on [NAME]",
      "arrays.isMarked": "[NAME] row [ROW] col [COL] marked?",
      "arrays.markedCount": "marks on [NAME]",
      "arrays.name": "Arrays & Tensors",
      "arrays.create1D": "create 1D array [NAME] from JSON [JSON]",
      "arrays.create2D": "create 2D array [NAME] from JSON [JSON]",
      "arrays.createEmpty": "create empty array [NAME]",
      "arrays.createZeros": "create array [NAME] of zeros with shape [SHAPE]",
      "arrays.createRange": "create array [NAME] from [START] to [END]",
      "arrays.get": "get [NAME] at [INDEX]",
      "arrays.get2D": "get [NAME] at row [ROW] col [COL]",
      "arrays.getMulti": "get [NAME] at indices [INDICES]",
      "arrays.set": "set [NAME] at [INDEX] to [VALUE]",
      "arrays.set2D": "set [NAME] at row [ROW] col [COL] to [VALUE]",
      "arrays.setMulti": "set [NAME] at indices [INDICES] to [VALUE]",
      "arrays.push": "push [VALUE] to [NAME]",
      "arrays.pop": "pop from [NAME]",
      "arrays.insert": "insert [VALUE] at [INDEX] in [NAME]",
      "arrays.remove": "remove at [INDEX] from [NAME]",
      "arrays.length": "length of [NAME]",
      "arrays.shape": "shape of [NAME]",
      "arrays.contains": "[NAME] contains [VALUE]",
      "arrays.indexOf": "index of [VALUE] in [NAME]",
      "arrays.slice": "slice [NAME] from [START] to [END]",
      "arrays.getRow": "get row [ROW] from [NAME]",
      "arrays.getColumn": "get column [COL] from [NAME]",
      "arrays.map": "map [NAME] with function [FUNC]",
      "arrays.filter": "filter [NAME] with function [FUNC]",
      "arrays.reduce": "reduce [NAME] with function [FUNC] initial [INIT]",
      "arrays.sort": "sort [NAME] [ORDER]",
      "arrays.reverse": "reverse [NAME]",
      "arrays.sum": "sum of [NAME]",
      "arrays.mean": "mean of [NAME]",
      "arrays.min": "min of [NAME]",
      "arrays.max": "max of [NAME]",
      "arrays.transpose": "transpose [NAME]",
      "arrays.flatten": "flatten [NAME]",
      "arrays.reshape": "reshape [NAME] to [SHAPE]",
      "arrays.toJSON": "convert [NAME] to JSON",
      "arrays.toString": "convert [NAME] to string",
      "arrays.delete": "delete array [NAME]",
      "arrays.listAll": "list all arrays",
      "arrays.ascending": "ascending",
      "arrays.descending": "descending",
      "arrays.namedReference": "reference to named array [NAME]",
      "arrays.parseLegacyValue": "parse array input [VALUE]",
      "arrays.jsonValue": "JSON text of value [VALUE]",
      "arrays.referenceValues": "array value [VALUE] followed by [REST]",
      "arrays.createReference": "new array reference from [VALUES]",
      "arrays.specialValue": "[KIND] value",
      "arrays.valueBinary": "value [LEFT] [OP] [RIGHT]",
      "arrays.stringFromCharCode": "text from char code [CODE]",
      "arrays.stringConcat": "concatenate text [TEXT] with [OTHER]",
      "arrays.stringCharCodeAt": "char code of text [TEXT] at [INDEX]",
      "arrays.valueUnary": "[OP] value [VALUE]",
      "arrays.valueTruthy": "truthiness of value [VALUE]",
      "arrays.valueCompare": "compare value [LEFT] [OP] with [RIGHT]",
      "arrays.referenceTruthy":
        "truthiness of item [INDEX] of array reference [ARRAY]",
      "arrays.referenceItem": "item [INDEX] of array reference [ARRAY]",
      "arrays.referenceRemove":
        "remove value [VALUE] from array reference [ARRAY]",
      "arrays.referenceRandom": "random item of array reference [ARRAY]",
      "arrays.referenceLength": "length of array reference [ARRAY]",
      "arrays.referenceSlice":
        "slice array reference [ARRAY] from [START] to [END]",
      "arrays.referenceConcat":
        "concatenate array reference [ARRAY] with [OTHER]",
      "arrays.referenceTake": "[OP] from array reference [ARRAY] index [INDEX]",
      "arrays.referenceIndexOf":
        "index of [VALUE] in array reference [ARRAY] from [INDEX]",
      "arrays.mutateReference":
        "array reference [ARRAY] [OP] index [INDEX] value [VALUE]",
    },
    de: {
      "arrays.showTable": "Tabelle [NAME] bei x [X] y [Y] zeigen",
      "arrays.hideTable": "Tabelle [NAME] verbergen",
      "arrays.setTableTitle": "Titel von Tabelle [NAME] auf [TITLE] setzen",
      "arrays.setTableStyle":
        "Tabelle [NAME] Zelle [W] mal [H] Schriftgröße [SIZE]",
      "arrays.markCell": "[NAME] Zeile [ROW] Spalte [COL] markieren",
      "arrays.unmarkCell":
        "Markierung [NAME] Zeile [ROW] Spalte [COL] entfernen",
      "arrays.clearMarks": "alle Markierungen auf [NAME] löschen",
      "arrays.isMarked": "[NAME] Zeile [ROW] Spalte [COL] markiert?",
      "arrays.markedCount": "Markierungen auf [NAME]",
      "arrays.name": "Arrays & Tensoren",
      "arrays.create1D": "1D-Array [NAME] aus JSON [JSON] erstellen",
      "arrays.create2D": "2D-Array [NAME] aus JSON [JSON] erstellen",
      "arrays.createEmpty": "leeres Array [NAME] erstellen",
      "arrays.createZeros":
        "Array [NAME] aus Nullen mit Form [SHAPE] erstellen",
      "arrays.createRange": "Array [NAME] von [START] bis [END] erstellen",
      "arrays.get": "[NAME] an [INDEX]",
      "arrays.get2D": "[NAME] an Zeile [ROW] Spalte [COL]",
      "arrays.getMulti": "[NAME] an Indizes [INDICES]",
      "arrays.set": "[NAME] an [INDEX] auf [VALUE] setzen",
      "arrays.set2D": "[NAME] an Zeile [ROW] Spalte [COL] auf [VALUE] setzen",
      "arrays.setMulti": "[NAME] an Indizes [INDICES] auf [VALUE] setzen",
      "arrays.push": "[VALUE] an [NAME] anhängen",
      "arrays.pop": "letztes Element aus [NAME] entfernen",
      "arrays.insert": "[VALUE] an [INDEX] in [NAME] einfügen",
      "arrays.remove": "an [INDEX] aus [NAME] entfernen",
      "arrays.length": "Länge von [NAME]",
      "arrays.shape": "Form von [NAME]",
      "arrays.contains": "[NAME] enthält [VALUE]",
      "arrays.indexOf": "Index von [VALUE] in [NAME]",
      "arrays.slice": "Ausschnitt von [NAME] von [START] bis [END]",
      "arrays.getRow": "Zeile [ROW] aus [NAME]",
      "arrays.getColumn": "Spalte [COL] aus [NAME]",
      "arrays.map": "[NAME] mit Funktion [FUNC] abbilden",
      "arrays.filter": "[NAME] mit Funktion [FUNC] filtern",
      "arrays.reduce":
        "[NAME] mit Funktion [FUNC] und Startwert [INIT] reduzieren",
      "arrays.sort": "[NAME] [ORDER] sortieren",
      "arrays.reverse": "[NAME] umkehren",
      "arrays.sum": "Summe von [NAME]",
      "arrays.mean": "Mittelwert von [NAME]",
      "arrays.min": "Minimum von [NAME]",
      "arrays.max": "Maximum von [NAME]",
      "arrays.transpose": "[NAME] transponieren",
      "arrays.flatten": "[NAME] abflachen",
      "arrays.reshape": "[NAME] zu [SHAPE] umformen",
      "arrays.toJSON": "[NAME] zu JSON konvertieren",
      "arrays.toString": "[NAME] zu Zeichenkette konvertieren",
      "arrays.delete": "Array [NAME] löschen",
      "arrays.listAll": "alle Arrays auflisten",
      "arrays.ascending": "aufsteigend",
      "arrays.descending": "absteigend",
    },
    fr: {
      "arrays.showTable": "afficher le tableau [NAME] à x [X] y [Y]",
      "arrays.hideTable": "cacher le tableau [NAME]",
      "arrays.setTableTitle": "définir le titre du tableau [NAME] à [TITLE]",
      "arrays.setTableStyle":
        "tableau [NAME] cellule [W] sur [H] taille du texte [SIZE]",
      "arrays.markCell": "marquer [NAME] ligne [ROW] colonne [COL]",
      "arrays.unmarkCell": "démarquer [NAME] ligne [ROW] colonne [COL]",
      "arrays.clearMarks": "effacer toutes les marques sur [NAME]",
      "arrays.isMarked": "[NAME] ligne [ROW] colonne [COL] marquée ?",
      "arrays.markedCount": "marques sur [NAME]",
      "arrays.name": "Tableaux et Tenseurs",
      "arrays.create1D": "créer tableau 1D [NAME] depuis JSON [JSON]",
      "arrays.create2D": "créer tableau 2D [NAME] depuis JSON [JSON]",
      "arrays.createEmpty": "créer tableau vide [NAME]",
      "arrays.createZeros": "créer tableau [NAME] de zéros avec forme [SHAPE]",
      "arrays.createRange": "créer tableau [NAME] de [START] à [END]",
      "arrays.get": "obtenir [NAME] à [INDEX]",
      "arrays.get2D": "obtenir [NAME] à ligne [ROW] colonne [COL]",
      "arrays.getMulti": "obtenir [NAME] aux indices [INDICES]",
      "arrays.set": "définir [NAME] à [INDEX] = [VALUE]",
      "arrays.set2D": "définir [NAME] à ligne [ROW] colonne [COL] = [VALUE]",
      "arrays.setMulti": "définir [NAME] aux indices [INDICES] = [VALUE]",
      "arrays.push": "ajouter [VALUE] à [NAME]",
      "arrays.pop": "retirer dernier élément de [NAME]",
      "arrays.insert": "insérer [VALUE] à [INDEX] dans [NAME]",
      "arrays.remove": "supprimer à [INDEX] de [NAME]",
      "arrays.length": "longueur de [NAME]",
      "arrays.shape": "forme de [NAME]",
      "arrays.contains": "[NAME] contient [VALUE]",
      "arrays.indexOf": "index de [VALUE] dans [NAME]",
      "arrays.slice": "extraire [NAME] de [START] à [END]",
      "arrays.getRow": "ligne [ROW] de [NAME]",
      "arrays.getColumn": "colonne [COL] de [NAME]",
      "arrays.map": "appliquer fonction [FUNC] à [NAME]",
      "arrays.filter": "filtrer [NAME] avec fonction [FUNC]",
      "arrays.reduce": "réduire [NAME] avec fonction [FUNC] initial [INIT]",
      "arrays.sort": "trier [NAME] [ORDER]",
      "arrays.reverse": "inverser [NAME]",
      "arrays.sum": "somme de [NAME]",
      "arrays.mean": "moyenne de [NAME]",
      "arrays.min": "minimum de [NAME]",
      "arrays.max": "maximum de [NAME]",
      "arrays.transpose": "transposer [NAME]",
      "arrays.flatten": "aplatir [NAME]",
      "arrays.reshape": "remodeler [NAME] en [SHAPE]",
      "arrays.toJSON": "convertir [NAME] en JSON",
      "arrays.toString": "convertir [NAME] en chaîne",
      "arrays.delete": "supprimer tableau [NAME]",
      "arrays.listAll": "lister tous les tableaux",
      "arrays.ascending": "croissant",
      "arrays.descending": "décroissant",
    },
  };

  function detectLanguage() {
    const candidates = [];
    try {
      if (typeof window !== "undefined" && window.ReduxStore?.getState) {
        candidates.push(window.ReduxStore.getState().locales?.locale);
      }
    } catch (e) {
      /* ignore */
    }
    try {
      candidates.push(localStorage.getItem("tw:language"));
    } catch (e) {
      /* ignore */
    }
    try {
      if (typeof Scratch !== "undefined" && Scratch.vm?.runtime?.getLocale) {
        candidates.push(Scratch.vm.runtime.getLocale());
      }
    } catch (e) {
      /* ignore */
    }
    try {
      candidates.push(document.documentElement.lang);
    } catch (e) {
      /* ignore */
    }
    try {
      candidates.push(navigator.language);
    } catch (e) {
      /* ignore */
    }
    for (const c of candidates) {
      if (typeof c !== "string" || !c) continue;
      const lower = c.toLowerCase();
      if (lower.startsWith("de")) return "de";
      if (lower.startsWith("fr")) return "fr";
      if (lower.startsWith("en")) return "en";
    }
    return "en";
  }

  let currentLang = detectLanguage();

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === "tw:language") {
        const newLang = detectLanguage();
        if (newLang !== currentLang) currentLang = newLang;
      }
    });
    let lastKnownLocale = null;
    setInterval(() => {
      try {
        if (window.ReduxStore?.getState) {
          const locale = window.ReduxStore.getState().locales?.locale;
          if (locale && locale !== lastKnownLocale) {
            lastKnownLocale = locale;
            const lower = locale.toLowerCase();
            const newLang = lower.startsWith("de")
              ? "de"
              : lower.startsWith("fr")
                ? "fr"
                : "en";
            if (newLang !== currentLang) currentLang = newLang;
          }
        }
      } catch (e) {
        /* ignore */
      }
    }, 1000);
  }

  function t(key, defaultValue) {
    const tr = translations[currentLang];
    if (tr && tr[key]) return tr[key];
    if (translations.en && translations.en[key]) return translations.en[key];
    return defaultValue !== undefined ? defaultValue : key;
  }

  // Storage for arrays (keyed by name)
  const arrays = {};
  // Per-table display state, keyed by array name. Separate from `arrays`
  // so styling and marks survive the array being rewritten in place.
  const tables = {};
  let _nextTempId = 0;

  // ==========================================================================
  // MAKECODE VALUES — the rules the array-reference blocks compute with.
  //
  // undefined is a value in MakeCode, but a Scratch reporter that returns
  // undefined means "reported nothing", so it travels as a tagged object
  // (UNDEFINED) that survives project JSON. An array reference is
  // {bwReference: {kind, id, scope}}: the id names an array in a heap kept per
  // runtime, the scope changes on every project start/load so a reference
  // saved in a project never names a live array of another run. Arithmetic
  // and comparison are JavaScript's (+ joins text, === is strict, NaN is
  // not equal to itself), as MakeCode runs them.
  //
  // A host that shares these rules between extensions (BrickWright Lite's
  // VM, whose Arcade sprites and images are references too) provides them as
  // Scratch.BWValues, with this same interface; they are then one heap and
  // one set of rules for every extension. Anywhere else this built-in copy
  // is used.
  // ==========================================================================
  const makeValues = () => {
    const isUndefined = (value) =>
      Boolean(value) &&
      typeof value === "object" &&
      Object.keys(value).length === 1 &&
      value.bwUndefined === true;
    const UNDEFINED = Object.freeze(
      Object.defineProperties(
        { bwUndefined: true },
        {
          toString: { value: () => "undefined" },
          valueOf: { value: () => NaN },
        }
      )
    );
    const KINDS = [
      "array",
      "image",
      "tile",
      "legacy-tile",
      "animation",
      "scene",
      "physics-engine",
      "player",
      "music",
      "sevenseg",
      "buffer",
      "object",
      "callable",
    ];
    const scopes = new WeakMap();
    const session =
      Date.now().toString(36) + ":" + Math.random().toString(36).slice(2);
    let nextScope = 0;
    const references = new Map();
    const collected =
      typeof FinalizationRegistry === "function"
        ? new FinalizationRegistry((key) => {
            const held = references.get(key);
            if (!held || !held.deref()) references.delete(key);
          })
        : null;
    const isReference = (value) =>
      Boolean(value) &&
      typeof value === "object" &&
      Object.keys(value).length === 1 &&
      Boolean(value.bwReference) &&
      KINDS.includes(value.bwReference.kind) &&
      typeof value.bwReference.id === "string" &&
      typeof value.bwReference.scope === "string";
    const restoreReference = (value) => {
      const ref = value.bwReference;
      const key = JSON.stringify([ref.scope, ref.kind, ref.id]);
      const held = references.get(key);
      const existing = held && held.deref();
      if (existing) return existing;
      if (typeof WeakRef === "function") {
        references.set(key, new WeakRef(value));
        if (collected) collected.register(value, key);
      }
      return value;
    };
    // Without a runtime (a unit test, a headless load) one key stands in.
    const NO_RUNTIME = {};
    const keyOf = (runtime) => runtime || NO_RUNTIME;
    const listen = (runtime, events, handler) => {
      if (runtime && typeof runtime.on === "function") {
        for (const event of events) runtime.on(event, handler);
      }
    };
    const scopeOf = (runtime) => {
      const key = keyOf(runtime);
      if (!scopes.has(key)) {
        scopes.set(key, session + ":" + ++nextScope);
        listen(runtime, ["PROJECT_START", "PROJECT_LOADED"], () =>
          scopes.set(key, session + ":" + ++nextScope)
        );
      }
      return scopes.get(key);
    };
    const reference = (runtime, kind, id) =>
      restoreReference({ bwReference: { kind, id, scope: scopeOf(runtime) } });
    const heaps = new WeakMap();
    const heapOf = (runtime) => {
      const key = keyOf(runtime);
      if (!heaps.has(key)) {
        const heap = { values: new Map(), objects: new WeakMap(), next: 0 };
        heaps.set(key, heap);
        listen(
          runtime,
          ["PROJECT_START", "PROJECT_LOADED", "RUNTIME_DISPOSED"],
          () => {
            heap.values.clear();
            heap.objects = new WeakMap();
          }
        );
      }
      return heaps.get(key);
    };
    const referenceId = (runtime, value, kind) =>
      isReference(value) &&
      value.bwReference.kind === kind &&
      value.bwReference.scope === scopes.get(keyOf(runtime))
        ? value.bwReference.id
        : null;
    const arrayReference = (runtime, array) => {
      if (!Array.isArray(array)) {
        throw new TypeError("Array reference requires an array");
      }
      const heap = heapOf(runtime);
      let id = heap.objects.get(array);
      if (!id) {
        id = "array-reference:" + ++heap.next;
        heap.objects.set(array, id);
        heap.values.set(id, array);
      }
      return reference(runtime, "array", id);
    };
    const arrayValue = (runtime, value) => {
      const id = referenceId(runtime, value, "array");
      return id === null ? undefined : heapOf(runtime).values.get(id);
    };
    const sameReference = (a, b) =>
      isReference(a) &&
      isReference(b) &&
      ["kind", "id", "scope"].every(
        (key) => a.bwReference[key] === b.bwReference[key]
      );
    const SPECIAL_NUMBERS = ["NaN", "Infinity", "-Infinity", "-0"];
    const decode = (value) => {
      if (isUndefined(value)) return undefined;
      if (isReference(value)) return restoreReference(value);
      if (
        value &&
        typeof value === "object" &&
        Object.keys(value).length === 1 &&
        SPECIAL_NUMBERS.includes(value.bwNumber)
      ) {
        return Number(value.bwNumber);
      }
      return value;
    };
    const encode = (value) =>
      value === undefined || isUndefined(value) ? UNDEFINED : decode(value);
    const equal = (a, b) => sameReference(a, b) || decode(a) === decode(b);
    const indexOf = (array, value, from = 0) => {
      const start = Math.trunc(Number(from)) || 0;
      for (
        let i = start < 0 ? Math.max(array.length + start, 0) : start;
        i < array.length;
        i++
      ) {
        if (i in array && equal(array[i], value)) return i;
      }
      return -1;
    };
    const binary = (left, op, right) => {
      const a = decode(left);
      const b = decode(right);
      if (
        ["&", "|", "^", "<<", ">>", ">>>"].includes(op) &&
        [a, b].some(
          (value) =>
            value !== null &&
            !["number", "string", "boolean", "undefined"].includes(typeof value)
        )
      ) {
        throw new Error(
          "Bitwise conversion requires primitive values, not opaque references or objects"
        );
      }
      switch (op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        case "%":
          return a % b;
        case "**":
          return a ** b;
        case "&":
          return a & b;
        case "|":
          return a | b;
        case "^":
          return a ^ b;
        case "<<":
          return a << b;
        case ">>":
          return a >> b;
        case ">>>":
          return a >>> b;
        default:
          throw new Error("Unknown value arithmetic " + op);
      }
    };
    const unary = (op, value) => {
      const a = decode(value);
      if (op === "+") return +a;
      if (op === "-") return -a;
      if (op === "~") {
        if (
          a !== null &&
          !["number", "string", "boolean", "undefined"].includes(typeof a)
        ) {
          throw new Error(
            "Bitwise conversion requires primitive values, not opaque references or objects"
          );
        }
        return ~a;
      }
      throw new Error("Unknown unary value arithmetic " + op);
    };
    const compare = (left, op, right) => {
      const a = decode(left);
      const b = sameReference(left, right) ? a : decode(right);
      switch (op) {
        // JavaScript's comparisons on purpose, loose null/undefined equality
        // and strict primitive distinctions included.
        case "==":
          return a == b;
        case "!=":
          return a != b;
        case "===":
          return a === b;
        case "!==":
          return a !== b;
        case "<":
          return a < b;
        case ">":
          return a > b;
        case "<=":
          return a <= b;
        case ">=":
          return a >= b;
        default:
          throw new Error("Unknown value comparison " + op);
      }
    };
    const jsonReplacer = (_key, value) =>
      typeof value === "number" &&
      (!Number.isFinite(value) || Object.is(value, -0))
        ? { bwNumber: Object.is(value, -0) ? "-0" : String(value) }
        : value;
    return {
      UNDEFINED,
      arrayReference,
      arrayValue,
      reference,
      referenceId,
      isReference,
      decode,
      encode,
      equal,
      indexOf,
      binary,
      unary,
      compare,
      jsonReplacer,
      truth: (value) => Boolean(decode(value)),
    };
  };
  let builtinValues = null;
  const valuesFor = () =>
    (typeof Scratch !== "undefined" && Scratch.BWValues) ||
    builtinValues ||
    (builtinValues = makeValues());

  // Optional embedding API. This catalogue describes operations, never element
  // types or producer authority. No host means a direct call to the old method.
  const operationSpecs = Object.freeze({
    create1D: ["named", "bind"],
    create2D: ["named", "bind"],
    createEmpty: ["named", "bind"],
    createZeros: ["named", "bind"],
    createRange: ["named", "bind"],
    delete: ["named", "unbind"],
    get: ["named", "read"],
    get2D: ["named", "read", true],
    getMulti: ["named", "read", true],
    set: ["named", "write"],
    set2D: ["named", "write", true],
    setMulti: ["named", "write", true],
    push: ["named", "write"],
    pop: ["named", "write"],
    insert: ["named", "write"],
    remove: ["named", "write"],
    length: ["named", "read"],
    shape: ["named", "read", true],
    contains: ["named", "read"],
    indexOf: ["named", "read"],
    slice: ["named", "read", true],
    getRow: ["named", "read", true],
    getColumn: ["named", "read", true],
    map: ["named", "escape", true],
    filter: ["named", "escape", true],
    reduce: ["named", "escape", true],
    sort: ["named", "read", true],
    reverse: ["named", "read", true],
    sum: ["named", "read", true],
    mean: ["named", "read", true],
    min: ["named", "read", true],
    max: ["named", "read", true],
    transpose: ["named", "read", true],
    flatten: ["named", "read", true],
    reshape: ["named", "read", true],
    toJSON: ["named", "read", true],
    toString: ["named", "read", true],
    listAll: ["registry", "read"],
    namedReference: ["namedString", "alias"],
    referenceValues: ["transport", "transport"],
    valueBinary: ["transport", "read"],
    createReference: ["transport", "allocate"],
    parseLegacyValue: ["transport", "transport"],
    jsonValue: ["transport", "read"],
    referenceTruthy: ["reference", "read"],
    referenceItem: ["reference", "read"],
    referenceRemove: ["reference", "write"],
    referenceRandom: ["reference", "read"],
    referenceLength: ["reference", "read"],
    referenceSlice: ["reference", "read"],
    referenceConcat: ["reference", "read"],
    referenceIndexOf: ["reference", "read"],
    referenceTake: ["reference", "write"],
    mutateReference: ["reference", "write"],
    showTable: ["namedString", "read", true],
    hideTable: ["namedString", "read"],
    setTableTitle: ["namedString", "read", true],
    setTableStyle: ["namedString", "read", true],
    markCell: ["namedString", "read", true],
    unmarkCell: ["namedString", "read", true],
    clearMarks: ["namedString", "read", true],
    isMarked: ["namedString", "read"],
    markedCount: ["namedString", "read"],
  });
  for (const spec of Object.values(operationSpecs)) Object.freeze(spec);
  // Allocation backing used by a primitive loan must come from these held
  // native JSON operations and indexed allocation, not late replaced globals or Array species.
  const allocationParse = JSON.parse;
  const allocationIsArray = Array.isArray;
  const allocationApply = Reflect.apply;
  const allocationFreeze = Object.freeze;
  const allocationDescriptor = Object.getOwnPropertyDescriptor;
  const allocationHasOwn = Object.prototype.hasOwnProperty;
  const allocationOwn = (value, key) =>
    allocationApply(allocationHasOwn, value, [key]);
  const allocationSome = Array.prototype.some;
  const allocationSame = Object.is;
  const allocationText = String;
  const allocationValues =
    Scratch.BWArrayOperations == null ? null : valuesFor();
  const allocationDecode = allocationValues && allocationValues.decode;
  const allocationReference =
    allocationValues && allocationValues.arrayReference;
  const allocationBody = allocationValues && allocationValues.arrayValue;
  const operationGet = WeakMap.prototype.get;
  const operationSet = WeakMap.prototype.set;
  const operationDelete = WeakMap.prototype.delete;
  const operations = new WeakMap();
  const currentOperation = (extension) =>
    allocationApply(operationGet, operations, [extension]);
  const access = (extension, facts) => {
    const operation = currentOperation(extension);
    if (!operation) return;
    try {
      return allocationApply(operation.host.access, operation.service, [
        operation.ticket,
        allocationFreeze({
          opcode: operation.opcode,
          runtime: extension._runtime,
          kind: operation.spec[1],
          slot: null,
          raw: undefined,
          body: undefined,
          name: undefined,
          parent: undefined,
          key: undefined,
          ...facts,
        }),
      ]);
    } catch (error) {
      operation.rejections.push(error);
      throw error;
    }
  };
  const rejectAccess = (extension, message) => {
    const error = new Error(message);
    const operation = currentOperation(extension);
    if (operation) operation.rejections.push(error);
    throw error;
  };
  const rethrowAccess = (extension, error) => {
    const operation = currentOperation(extension);
    if (
      operation &&
      allocationApply(allocationSome, operation.rejections, [
        (item) => allocationSame(item, error),
      ])
    ) {
      throw error;
    }
  };
  const bodyAccess = (
    extension,
    body,
    facts,
    deep = false,
    seen = new Set()
  ) => {
    access(extension, { ...facts, body });
    if (!body || typeof body !== "object" || seen.has(body)) return;
    seen.add(body);
    // Do not execute getters merely to discover a hidden enrolled descendant.
    // Hosts can use ordinary JSON/data arrays; accessor aggregates are refused.
    for (const key of Reflect.ownKeys(body)) {
      const descriptor = Object.getOwnPropertyDescriptor(body, key);
      if (!descriptor || !("value" in descriptor)) {
        rejectAccess(
          extension,
          "Array host guards require data-only aggregate properties"
        );
      }
      const child = descriptor.value;
      if (deep && child && typeof child === "object") {
        bodyAccess(
          extension,
          child,
          { ...facts, parent: body, key },
          true,
          seen
        );
      }
    }
    if (deep && valuesFor().isReference(body)) {
      access(extension, { ...facts, kind: "transport", raw: body });
      const linked = valuesFor().arrayValue(extension._runtime, body);
      if (linked)
        bodyAccess(extension, linked, { ...facts, raw: body }, true, seen);
    }
  };
  const bindingValue = (extension, value) => {
    if (currentOperation(extension)) {
      bodyAccess(extension, value, {
        kind: "bind",
        slot: "NAME",
        name: currentOperation(extension).name,
      });
    }
    return value;
  };
  const selectedValue = (extension, value) => {
    if (currentOperation(extension)) {
      access(extension, { kind: "select", slot: "VALUE", raw: value });
      if (Array.isArray(value))
        bodyAccess(extension, value, { kind: "select", slot: "VALUE" });
    }
    return value;
  };
  // Recheck the live operation after argument coercion, immediately before
  // committing an effect. The value and original args are never replaced.
  const effectValue = (extension, value, body, kind = "write") => {
    const operation = currentOperation(extension);
    if (operation && kind === "write")
      bodyAccess(
        extension,
        value,
        { kind: "transport", slot: "VALUE", raw: operation.args.VALUE },
        true
      );
    if (operation)
      bodyAccess(
        extension,
        body === undefined ? operation.body : body,
        { kind, slot: null, raw: operation.args },
        true
      );
    return value;
  };
  const nativeMutators = Object.freeze(
    Object.fromEntries(
      ["push", "pop", "unshift", "shift", "splice", "reverse"].map((name) => [
        name,
        Array.prototype[name],
      ])
    )
  );
  const mutateArray = (extension, body, name, callee, args) => {
    bodyAccess(
      extension,
      args,
      { kind: "transport", slot: null, raw: currentOperation(extension).args },
      true
    );
    effectValue(extension, undefined, body);
    // A user-replaced method is executable code, just like legacy map FUNC.
    // Hosts may deny that escape for an owned body without changing unowned use.
    if (callee !== nativeMutators[name])
      bodyAccess(
        extension,
        body,
        { kind: "escape", slot: null, raw: currentOperation(extension).args },
        true
      );
    return Reflect.apply(callee, body, args);
  };
  const propertyKey = (value) => Reflect.ownKeys({ [value]: null })[0];
  const namedKey = (extension, args, stringOnly = false) => {
    const operation = currentOperation(extension);
    if (operation && operation.args === args) return operation.name;
    return stringOnly ? String(args.NAME) : args.NAME;
  };
  const namedArray = (extension, args) => {
    const operation = currentOperation(extension);
    return operation && operation.args === args
      ? operation.body
      : arrays[args.NAME];
  };

  // The host may preserve a physical Number input before Scratch's string
  // socket flattens it. It owns that decision; standalone hosts keep their
  // existing value semantics. Pass the original args and utility unchanged.
  const valueInput = (args, util, opcode, name) => {
    const hostInput = Scratch.BWNumberInput;
    return typeof hostInput === "function"
      ? hostInput(args, util, opcode, name)
      : args[name];
  };

  // Only an embedding host can lend an actual owned Array's primitive value.
  // Standalone operation keeps the original reference/object behavior. The host
  // receives the original operand slot and current private operation ticket;
  // the supplier never obtains a generic reference-to-string capability.
  // Necessary negative prefilter only: primitive-only operands cannot request
  // an Array loan. Inspect descriptors without invoking input getters; all
  // object/uncertain cases retain the full guarded route.
  const scalarBinaryInputs = (args) => {
    if (!args || typeof args !== "object") return false;
    const left = allocationDescriptor(args, "LEFT");
    const right = allocationDescriptor(args, "RIGHT");
    return (
      left &&
      right &&
      allocationOwn(left, "value") &&
      allocationOwn(right, "value") &&
      (left.value === null || typeof left.value !== "object") &&
      (right.value === null || typeof right.value !== "object")
    );
  };
  const binaryOperand = (extension, values, value, slot, op) => {
    const operation = currentOperation(extension);
    if (
      !operation ||
      op !== "+" ||
      !values.isReference(value) ||
      value.bwReference.kind !== "array"
    )
      return value;
    if (typeof operation.primitive !== "function")
      rejectAccess(
        extension,
        "Array addition requires the host primitive loan"
      );
    try {
      const primitive = allocationApply(
        operation.primitive,
        operation.service,
        [
          operation.ticket,
          allocationFreeze({
            opcode: operation.opcode,
            runtime: extension._runtime,
            slot,
            raw: value,
          }),
        ]
      );
      if (typeof primitive !== "string")
        rejectAccess(extension, "Array primitive loan must return a string");
      return primitive;
    } catch (error) {
      operation.rejections.push(error);
      throw error;
    }
  };

  class ArrayExtension {
    constructor() {
      this._runtime = (Scratch.vm && Scratch.vm.runtime) || null;
    }

    getInfo() {
      return {
        id: "arrays",
        name: t("arrays.name"),
        color1: "#FF6680",
        color2: "#FF4D6A",
        color3: "#FF3355",
        blocks: [
          {
            opcode: "create1D",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.create1D"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              JSON: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[1,2,3,4,5]",
              },
            },
          },
          {
            opcode: "create2D",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.create2D"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
              JSON: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[[1,2],[3,4]]",
              },
            },
          },
          {
            opcode: "createEmpty",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.createEmpty"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "createZeros",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.createZeros"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "zeros",
              },
              SHAPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[3,3]",
              },
            },
          },
          {
            opcode: "createRange",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.createRange"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "range",
              },
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 10 },
            },
          },
          "---",
          {
            opcode: "get",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.get"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              INDEX: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
            },
          },
          {
            opcode: "get2D",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.get2D"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
              ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              COL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "getMulti",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.getMulti"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "tensor",
              },
              INDICES: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[0,1,2]",
              },
            },
          },
          "---",
          {
            opcode: "set",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.set"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              INDEX: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "42" },
            },
          },
          {
            opcode: "set2D",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.set2D"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
              ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              COL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "42" },
            },
          },
          {
            opcode: "setMulti",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.setMulti"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "tensor",
              },
              INDICES: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[0,1,2]",
              },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "42" },
            },
          },
          "---",
          {
            opcode: "push",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.push"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "42" },
            },
          },
          {
            opcode: "pop",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.pop"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "insert",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.insert"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "42" },
            },
          },
          {
            opcode: "remove",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.remove"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          "---",
          {
            opcode: "length",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.length"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "shape",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.shape"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
            },
          },
          {
            opcode: "contains",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("arrays.contains"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "5" },
            },
          },
          {
            opcode: "indexOf",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.indexOf"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "5" },
            },
          },
          "---",
          {
            opcode: "slice",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.slice"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 3 },
            },
          },
          {
            opcode: "getRow",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.getRow"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
              ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "getColumn",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.getColumn"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
              COL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          "---",
          {
            opcode: "map",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.map"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              FUNC: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x => x * 2",
              },
            },
          },
          {
            opcode: "filter",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.filter"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              FUNC: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "x => x > 5",
              },
            },
          },
          {
            opcode: "reduce",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.reduce"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              FUNC: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "(acc,x) => acc+x",
              },
              INIT: { type: Scratch.ArgumentType.STRING, defaultValue: "0" },
            },
          },
          {
            opcode: "sort",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.sort"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              ORDER: { type: Scratch.ArgumentType.STRING, menu: "sortOrder" },
            },
          },
          {
            opcode: "reverse",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.reverse"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          "---",
          {
            opcode: "sum",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.sum"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "mean",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.mean"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "min",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.min"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "max",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.max"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          "---",
          {
            opcode: "transpose",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.transpose"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
            },
          },
          {
            opcode: "flatten",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.flatten"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "matrix",
              },
            },
          },
          {
            opcode: "reshape",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.reshape"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              SHAPE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "[3,3]",
              },
            },
          },
          "---",
          {
            opcode: "toJSON",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.toJSON"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "toString",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.toString"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "delete",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.delete"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "listAll",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.listAll"),
          },
          {
            opcode: "showTable",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.showTable"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "hideTable",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.hideTable"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "setTableTitle",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.setTableTitle"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              TITLE: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "Player 1",
              },
            },
          },
          {
            opcode: "setTableStyle",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.setTableStyle"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 44 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 30 },
              SIZE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 16 },
            },
          },
          {
            opcode: "markCell",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.markCell"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              COL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "unmarkCell",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.unmarkCell"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              COL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "clearMarks",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.clearMarks"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "isMarked",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("arrays.isMarked"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
              ROW: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
              COL: { type: Scratch.ArgumentType.NUMBER, defaultValue: 1 },
            },
          },
          {
            opcode: "markedCount",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.markedCount"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          "---",
          // Array REFERENCES and MakeCode values (see the section below the
          // class): what an imported MakeCode Arcade program's arrays are.
          {
            opcode: "namedReference",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.namedReference"),
            arguments: {
              NAME: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "myArray",
              },
            },
          },
          {
            opcode: "parseLegacyValue",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.parseLegacyValue"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
            },
          },
          {
            opcode: "jsonValue",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.jsonValue"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
            },
          },
          {
            opcode: "referenceValues",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceValues"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING, defaultValue: "" },
              REST: { type: Scratch.ArgumentType.STRING, defaultValue: "[]" },
            },
          },
          {
            opcode: "createReference",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.createReference"),
            arguments: {
              VALUES: { type: Scratch.ArgumentType.STRING, defaultValue: "[]" },
            },
          },
          {
            opcode: "specialValue",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.specialValue"),
            arguments: {
              KIND: {
                type: Scratch.ArgumentType.STRING,
                menu: "specialValues",
                defaultValue: "undefined",
              },
            },
          },
          {
            opcode: "valueBinary",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.valueBinary"),
            arguments: {
              LEFT: { type: Scratch.ArgumentType.STRING },
              OP: {
                type: Scratch.ArgumentType.STRING,
                menu: "valueOperations",
                defaultValue: "+",
              },
              RIGHT: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "stringFromCharCode",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.stringFromCharCode"),
            arguments: {
              CODE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 65 },
            },
          },
          {
            opcode: "stringCharCodeAt",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.stringCharCodeAt"),
            arguments: {
              TEXT: { type: Scratch.ArgumentType.STRING },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "stringConcat",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.stringConcat"),
            arguments: {
              TEXT: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: "hello",
              },
              OTHER: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: " world",
              },
            },
          },
          {
            opcode: "valueUnary",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.valueUnary"),
            arguments: {
              OP: {
                type: Scratch.ArgumentType.STRING,
                menu: "valueUnaryOperations",
                defaultValue: "-",
              },
              VALUE: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "valueTruthy",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("arrays.valueTruthy"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "valueCompare",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("arrays.valueCompare"),
            arguments: {
              LEFT: { type: Scratch.ArgumentType.STRING },
              OP: {
                type: Scratch.ArgumentType.STRING,
                menu: "valueComparisons",
                defaultValue: "===",
              },
              RIGHT: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceTruthy",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("arrays.referenceTruthy"),
            arguments: {
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              ARRAY: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceItem",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceItem"),
            arguments: {
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              ARRAY: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceRemove",
            blockType: Scratch.BlockType.BOOLEAN,
            text: t("arrays.referenceRemove"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING },
              ARRAY: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceRandom",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceRandom"),
            arguments: {
              ARRAY: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceLength",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceLength"),
            arguments: {
              ARRAY: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceSlice",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceSlice"),
            arguments: {
              ARRAY: { type: Scratch.ArgumentType.STRING },
              START: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              END: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "referenceConcat",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceConcat"),
            arguments: {
              ARRAY: { type: Scratch.ArgumentType.STRING },
              OTHER: { type: Scratch.ArgumentType.STRING },
            },
          },
          {
            opcode: "referenceTake",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceTake"),
            arguments: {
              OP: {
                type: Scratch.ArgumentType.STRING,
                menu: "referenceTakeOperations",
                defaultValue: "pop",
              },
              ARRAY: { type: Scratch.ArgumentType.STRING },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "referenceIndexOf",
            blockType: Scratch.BlockType.REPORTER,
            text: t("arrays.referenceIndexOf"),
            arguments: {
              VALUE: { type: Scratch.ArgumentType.STRING },
              ARRAY: { type: Scratch.ArgumentType.STRING },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
            },
          },
          {
            opcode: "mutateReference",
            blockType: Scratch.BlockType.COMMAND,
            text: t("arrays.mutateReference"),
            arguments: {
              ARRAY: { type: Scratch.ArgumentType.STRING },
              OP: {
                type: Scratch.ArgumentType.STRING,
                menu: "referenceMutations",
                defaultValue: "push",
              },
              INDEX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              VALUE: { type: Scratch.ArgumentType.STRING },
            },
          },
        ],
        menus: {
          specialValues: {
            acceptReporters: false,
            items: ["undefined", "null"],
          },
          valueOperations: {
            acceptReporters: false,
            items: [
              "+",
              "-",
              "*",
              "/",
              "%",
              "**",
              "&",
              "|",
              "^",
              "<<",
              ">>",
              ">>>",
            ],
          },
          valueUnaryOperations: {
            acceptReporters: false,
            items: ["+", "-", "~"],
          },
          valueComparisons: {
            acceptReporters: false,
            items: ["==", "!=", "===", "!==", "<", ">", "<=", ">="],
          },
          referenceTakeOperations: {
            acceptReporters: true,
            items: ["pop", "shift", "removeAt"],
          },
          referenceMutations: {
            acceptReporters: true,
            items: [
              "push",
              "unshift",
              "set",
              "insertAt",
              "removeAt",
              "removeElement",
              "pop",
              "shift",
              "reverse",
              "length",
            ],
          },
          sortOrder: {
            acceptReporters: true,
            items: [
              { text: t("arrays.ascending"), value: "ascending" },
              { text: t("arrays.descending"), value: "descending" },
            ],
          },
        },
      };
    }

    // Helper to parse value (try number, then JSON, then string)
    parseValue(val) {
      // A MakeCode value (undefined, an array reference) arriving from a
      // reference block is its value here, not the text of its wrapper.
      val = valuesFor().decode(val);
      if (val === "") return "";
      const num = Number(val);
      if (!isNaN(num)) return num;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }

    // Create arrays
    create1D(args) {
      try {
        arrays[namedKey(this, args)] = bindingValue(
          this,
          JSON.parse(args.JSON)
        );
      } catch (e) {
        rethrowAccess(this, e);
        arrays[namedKey(this, args)] = bindingValue(this, []);
      }
    }

    create2D(args) {
      try {
        arrays[namedKey(this, args)] = bindingValue(
          this,
          JSON.parse(args.JSON)
        );
      } catch (e) {
        rethrowAccess(this, e);
        arrays[namedKey(this, args)] = bindingValue(this, [[]]);
      }
    }

    createEmpty(args) {
      const operation = currentOperation(this);
      let body;
      if (
        operation &&
        operation.ticket !== undefined &&
        typeof args.NAME === "string" &&
        operation.name === args.NAME
      ) {
        body = access(this, {
          kind: "empty-allocation",
          slot: "NAME",
          raw: args.NAME,
          name: operation.name,
        });
        if (!allocationIsArray(body)) {
          rejectAccess(
            this,
            "Named empty allocation requires its current host body"
          );
        }
      } else {
        // No host, or a non-String name outside the primitive birth profile.
        // Preserve the original allocation without claiming primitive origin.
        body = [];
      }
      arrays[namedKey(this, args)] = bindingValue(this, body);
    }

    createZeros(args) {
      try {
        const shape = JSON.parse(args.SHAPE);
        effectValue(this, undefined, undefined, "bind");
        const createNDArray = (dims, index = 0) => {
          if (index === dims.length - 1) {
            return new Array(dims[index]).fill(0);
          }
          return new Array(dims[index])
            .fill(null)
            .map(() => createNDArray(dims, index + 1));
        };
        arrays[namedKey(this, args)] = bindingValue(this, createNDArray(shape));
      } catch (e) {
        rethrowAccess(this, e);
        arrays[namedKey(this, args)] = bindingValue(this, []);
      }
    }

    createRange(args) {
      const start = Number(args.START);
      const end = Number(args.END);
      const arr = [];
      effectValue(this, undefined, undefined, "bind");
      for (let i = start; i <= end; i++) {
        arr.push(i);
      }
      arrays[namedKey(this, args)] = bindingValue(this, arr);
    }

    // Get/Set operations
    _legacyItemResult(value, aggregateJSON = false) {
      const values = valuesFor();
      value = values.decode(value);
      // JSON remains the legacy aggregate transport. Scalar text is already
      // its value, including when it resembles JSON or a reference token.
      if (
        value !== null &&
        typeof value === "object" &&
        !values.isReference(value)
      ) {
        return aggregateJSON ? JSON.stringify(value) : value;
      }
      return values.encode(value);
    }

    get(args) {
      const arr = namedArray(this, args);
      if (!arr) return "";
      const idx = Number(args.INDEX);
      return this._legacyItemResult(arr[idx], true);
    }

    get2D(args) {
      const arr = namedArray(this, args);
      if (!arr || !arr[args.ROW]) return "";
      return this._legacyItemResult(arr[args.ROW][args.COL]);
    }

    getMulti(args) {
      const arr = namedArray(this, args);
      if (!arr) return "";
      try {
        const indices = JSON.parse(args.INDICES);
        let result = arr;
        for (const idx of indices) {
          result = result[idx];
        }
        return this._legacyItemResult(result, true);
      } catch (e) {
        rethrowAccess(this, e);
        return "";
      }
    }

    set(args) {
      const arr = namedArray(this, args);
      if (!arr) return;
      const idx = Number(args.INDEX);
      if (currentOperation(this)) {
        const value = this.parseValue(args.VALUE);
        arr[idx] = effectValue(this, value, arr);
      } else arr[idx] = this.parseValue(args.VALUE);
    }

    set2D(args) {
      const arr = namedArray(this, args);
      if (!arr) return;
      if (currentOperation(this)) {
        // Preserve every ROW conversion, including the conditional write. JS
        // assignment converts its final property key AFTER evaluating the RHS.
        if (!arr[args.ROW]) {
          const rawRow = args.ROW,
            row = [],
            key = propertyKey(rawRow);
          arr[key] = effectValue(this, row, arr);
        }
        const target = arr[args.ROW],
          rawColumn = args.COL;
        const value = this.parseValue(args.VALUE);
        if (target === null || target === undefined) {
          effectValue(this, value, arr);
          target[rawColumn] = value; // Retain original nullish-base TypeError without key coercion.
        }
        const column = propertyKey(rawColumn);
        target[column] = effectValue(this, value, arr);
      } else {
        if (!arr[args.ROW]) arr[args.ROW] = [];
        arr[args.ROW][args.COL] = this.parseValue(args.VALUE);
      }
    }

    setMulti(args) {
      const arr = namedArray(this, args);
      if (!arr) return;
      try {
        const indices = JSON.parse(args.INDICES);
        let target = arr;
        for (let i = 0; i < indices.length - 1; i++) {
          target = target[indices[i]];
        }
        if (currentOperation(this)) {
          const rawKey = indices[indices.length - 1],
            value = this.parseValue(args.VALUE);
          if (target === null || target === undefined) {
            effectValue(this, value, arr);
            target[rawKey] = value;
          }
          const key = propertyKey(rawKey);
          target[key] = effectValue(this, value, arr);
        } else
          target[indices[indices.length - 1]] = this.parseValue(args.VALUE);
      } catch (e) {
        rethrowAccess(this, e);
        // ignore
      }
    }

    // Array operations
    push(args) {
      const arr = namedArray(this, args);
      if (!arr) return;
      if (currentOperation(this)) {
        const callee = arr.push,
          value = this.parseValue(args.VALUE);
        mutateArray(this, arr, "push", callee, [value]);
      } else arr.push(this.parseValue(args.VALUE));
    }

    pop(args) {
      const arr = namedArray(this, args);
      if (!arr || arr.length === 0) return "";
      if (currentOperation(this)) selectedValue(this, arr[arr.length - 1]);
      return this._legacyItemResult(
        currentOperation(this)
          ? mutateArray(this, arr, "pop", arr.pop, [])
          : arr.pop()
      );
    }

    insert(args) {
      const arr = namedArray(this, args);
      if (!arr) return;
      if (currentOperation(this)) {
        const callee = arr.splice,
          index = Number(args.INDEX),
          value = this.parseValue(args.VALUE);
        mutateArray(this, arr, "splice", callee, [index, 0, value]);
      } else arr.splice(Number(args.INDEX), 0, this.parseValue(args.VALUE));
    }

    remove(args) {
      const arr = namedArray(this, args);
      if (!arr) return;
      if (currentOperation(this)) {
        const callee = arr.splice,
          index = Number(args.INDEX);
        mutateArray(this, arr, "splice", callee, [index, 1]);
      } else arr.splice(Number(args.INDEX), 1);
    }

    // Info operations
    length(args) {
      const arr = namedArray(this, args);
      return arr ? arr.length : 0;
    }

    shape(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";

      const getShape = (a) => {
        if (!Array.isArray(a)) return [];
        const shape = [a.length];
        if (a.length > 0 && Array.isArray(a[0])) {
          return shape.concat(getShape(a[0]));
        }
        return shape;
      };

      return JSON.stringify(getShape(arr));
    }

    contains(args) {
      const arr = namedArray(this, args);
      if (!arr) return false;
      const val = this.parseValue(args.VALUE);
      return arr.includes(val);
    }

    indexOf(args) {
      const arr = namedArray(this, args);
      if (!arr) return -1;
      const val = this.parseValue(args.VALUE);
      return arr.indexOf(val);
    }

    // Slicing and selection
    slice(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      const result = arr.slice(Number(args.START), Number(args.END));
      return JSON.stringify(result);
    }

    getRow(args) {
      const arr = namedArray(this, args);
      if (!arr || !arr[args.ROW]) return "[]";
      return JSON.stringify(arr[args.ROW]);
    }

    getColumn(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      const col = Number(args.COL);
      const result = arr.map((row) => row[col]);
      return JSON.stringify(result);
    }

    // Functional operations
    map(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      try {
        // new Function instead of eval: still compiles user JS (this is the
        // feature — user-typed arrow functions for map/filter/reduce blocks)
        // but the resulting fn only sees globals, not this method's locals.
        // eslint-disable-next-line no-new-func
        const func = new Function(`return (${args.FUNC});`)();
        const result = arr.map(func);
        return JSON.stringify(result);
      } catch (e) {
        rethrowAccess(this, e);
        return "[]";
      }
    }

    filter(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      try {
        // eslint-disable-next-line no-new-func
        const func = new Function(`return (${args.FUNC});`)();
        const result = arr.filter(func);
        return JSON.stringify(result);
      } catch (e) {
        rethrowAccess(this, e);
        return "[]";
      }
    }

    reduce(args) {
      const arr = namedArray(this, args);
      if (!arr) return "";
      try {
        // eslint-disable-next-line no-new-func
        const func = new Function(`return (${args.FUNC});`)();
        const init = this.parseValue(args.INIT);
        return this._legacyItemResult(arr.reduce(func, init));
      } catch (e) {
        rethrowAccess(this, e);
        return "";
      }
    }

    sort(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      const sorted = [...arr].sort((a, b) => {
        if (args.ORDER === "ascending") return a - b;
        return b - a;
      });
      return JSON.stringify(sorted);
    }

    reverse(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      return JSON.stringify([...arr].reverse());
    }

    // Math operations
    sum(args) {
      const arr = namedArray(this, args);
      if (!arr) return 0;
      const flatten = (a) => (Array.isArray(a) ? a.flatMap(flatten) : [a]);
      return flatten(arr).reduce((sum, x) => sum + Number(x || 0), 0);
    }

    mean(args) {
      const arr = namedArray(this, args);
      if (!arr || arr.length === 0) return 0;
      const flatten = (a) => (Array.isArray(a) ? a.flatMap(flatten) : [a]);
      const flat = flatten(arr);
      return flat.reduce((sum, x) => sum + Number(x || 0), 0) / flat.length;
    }

    min(args) {
      const arr = namedArray(this, args);
      if (!arr) return 0;
      const flatten = (a) => (Array.isArray(a) ? a.flatMap(flatten) : [a]);
      return Math.min(...flatten(arr).map(Number));
    }

    max(args) {
      const arr = namedArray(this, args);
      if (!arr) return 0;
      const flatten = (a) => (Array.isArray(a) ? a.flatMap(flatten) : [a]);
      return Math.max(...flatten(arr).map(Number));
    }

    // Advanced operations
    transpose(args) {
      const arr = namedArray(this, args);
      if (!arr || !arr[0]) return "[]";
      const result = arr[0].map((_, i) => arr.map((row) => row[i]));
      return JSON.stringify(result);
    }

    flatten(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      const flatten = (a) => (Array.isArray(a) ? a.flatMap(flatten) : [a]);
      return JSON.stringify(flatten(arr));
    }

    reshape(args) {
      const arr = namedArray(this, args);
      if (!arr) return "[]";
      try {
        const shape = JSON.parse(args.SHAPE);
        const flatten = (a) => (Array.isArray(a) ? a.flatMap(flatten) : [a]);
        const flat = flatten(arr);

        const reshape = (data, dims, index = 0) => {
          if (index === dims.length - 1) {
            return data.splice(0, dims[index]);
          }
          const result = [];
          for (let i = 0; i < dims[index]; i++) {
            result.push(reshape(data, dims, index + 1));
          }
          return result;
        };

        return JSON.stringify(reshape([...flat], shape));
      } catch (e) {
        rethrowAccess(this, e);
        return "[]";
      }
    }

    // Utility
    toJSON(args) {
      const arr = namedArray(this, args);
      return arr ? JSON.stringify(arr) : "[]";
    }

    toString(args) {
      const arr = namedArray(this, args);
      return arr ? arr.toString() : "";
    }

    delete(args) {
      effectValue(this, undefined, undefined, "unbind");
      delete arrays[namedKey(this, args)];
    }

    listAll() {
      return JSON.stringify(Object.keys(arrays));
    }

    // ========================================================================
    // ARRAY REFERENCES AND MAKECODE VALUES
    //
    // A MakeCode Arcade program shares arrays by IDENTITY (two variables, one
    // array; a function that pushes onto its argument) and computes with
    // JavaScript's values (undefined, null, ===, + that joins text). The
    // named arrays above are values copied by name, so an imported program's
    // arrays are REFERENCES instead: a reporter returns a small token naming
    // an array in a per-runtime heap, and these blocks act on the array it
    // names. The value rules live in valuesFor() below.
    // ========================================================================

    _error(message) {
      if (this._runtime && this._runtime.emit) {
        this._runtime.emit("BLOCKS_ERROR", message);
      }
    }

    _array(args) {
      const operation = currentOperation(this);
      const array =
        operation && operation.args === args
          ? operation.body
          : valuesFor().arrayValue(this._runtime, args.ARRAY);
      if (!array) this._error("Array reference is null or expired");
      return array;
    }

    _arrayResult(value) {
      const values = valuesFor();
      return Array.isArray(value)
        ? values.arrayReference(this._runtime, value)
        : values.encode(value);
    }

    specialValue(args) {
      return String(args.KIND) === "null" ? null : valuesFor().UNDEFINED;
    }

    valueBinary(args, util) {
      const values = valuesFor(),
        op = String(args.OP),
        leftInput = valueInput(args, util, "arrays_valueBinary", "LEFT"),
        rightInput = valueInput(args, util, "arrays_valueBinary", "RIGHT"),
        left = binaryOperand(this, values, leftInput, "LEFT", op),
        right = binaryOperand(this, values, rightInput, "RIGHT", op);
      if (["&", "|", "^", "<<", ">>", ">>>"].includes(op)) {
        try {
          return values.binary(left, op, right);
        } catch (error) {
          rethrowAccess(this, error);
          this._error(error.message);
          return values.encode(undefined);
        }
      }
      return values.binary(left, op, right);
    }

    // PXT String_::fromCharCode takes one numeric argument and uses the
    // simulator's UTF-16 code-unit conversion, including fractional/wrapped
    // numbers and NaN. Reference tokens are never converted to their handle
    // spelling; they have no primitive String conversion in this adapter.
    stringFromCharCode(args) {
      const value = valuesFor().decode(args.CODE);
      if (
        value !== null &&
        (typeof value === "object" || typeof value === "function")
      ) {
        this._error("Character code cannot be an opaque reference or object");
        return valuesFor().encode(undefined);
      }
      return String.fromCharCode(value);
    }

    // Selected PXT String_::charCodeAt checks its original index range before
    // UTF-16 conversion. Out-of-range, NaN and undefined therefore return 0;
    // -0.5 is outside even though JS charCodeAt alone would truncate it to 0.
    stringCharCodeAt(args) {
      const values = valuesFor();
      const text = values.decode(args.TEXT);
      const index = values.decode(args.INDEX);
      if (typeof text !== "string") {
        this._error("Character code needs a non-null string receiver");
        return values.encode(undefined);
      }
      if (
        index !== null &&
        (typeof index === "object" || typeof index === "function")
      ) {
        this._error("Character index cannot be an opaque reference or object");
        return values.encode(undefined);
      }
      return 0 <= index && index < text.length ? text.charCodeAt(index) : 0;
    }

    // The original String_::concat checks the receiver for null, then adds
    // the other primitive. In particular a null/undefined argument is text,
    // whereas a null/undefined receiver is an error.
    stringConcat(args) {
      const text = valuesFor().decode(args.TEXT);
      const other = valuesFor().decode(args.OTHER);
      if (typeof text !== "string") {
        this._error("String concatenation needs a non-null string receiver");
        return valuesFor().encode(undefined);
      }
      if (
        other !== null &&
        (typeof other === "object" || typeof other === "function")
      ) {
        this._error(
          "String concatenation cannot convert an opaque reference or object"
        );
        return valuesFor().encode(undefined);
      }
      return text + other;
    }

    valueUnary(args, util) {
      const values = valuesFor(),
        op = String(args.OP),
        value = valueInput(args, util, "arrays_valueUnary", "VALUE");
      if (op === "~") {
        try {
          return values.unary(op, value);
        } catch (error) {
          rethrowAccess(this, error);
          this._error(error.message);
          return values.encode(undefined);
        }
      }
      return values.unary(op, value);
    }

    valueTruthy(args, util) {
      return valuesFor().truth(
        valueInput(args, util, "arrays_valueTruthy", "VALUE")
      );
    }

    valueCompare(args, util) {
      return valuesFor().compare(
        valueInput(args, util, "arrays_valueCompare", "LEFT"),
        String(args.OP),
        valueInput(args, util, "arrays_valueCompare", "RIGHT")
      );
    }

    referenceValues(args, util) {
      const operation = currentOperation(this);
      const raw = operation ? args.REST : undefined;
      let rest;
      try {
        rest = JSON.parse(String(operation ? raw : args.REST));
      } catch (e) {
        rethrowAccess(this, e);
        rest = null;
      }
      if (operation)
        access(this, {
          kind: "transport",
          slot: "REST",
          raw,
          body: rest,
        });
      if (!Array.isArray(rest)) {
        this._error("Array value chain requires an array tail");
        return "[]";
      }
      return JSON.stringify(
        [valueInput(args, util, "arrays_referenceValues", "VALUE"), ...rest],
        valuesFor().jsonReplacer
      );
    }

    createReference(args) {
      const operation = currentOperation(this);
      const raw = operation ? args.VALUES : undefined;
      const literal = operation && operation.ticket !== undefined;
      let list;
      try {
        const text = literal
          ? allocationText(raw)
          : String(operation ? raw : args.VALUES);
        if (literal)
          access(this, {
            kind: "literal-ingress",
            slot: "VALUES",
            raw,
            text,
            parser: allocationParse,
            stringify: allocationText,
            decoder: allocationDecode,
            reference: allocationReference,
            lookup: allocationBody,
          });
        list = literal ? allocationParse(text) : JSON.parse(text);
      } catch (e) {
        rethrowAccess(this, e);
        list = null;
      }
      if (operation && !literal)
        access(this, {
          kind: "transport",
          slot: "VALUES",
          raw,
          body: list,
        });
      if (!Array.isArray(list)) {
        this._error("Array reference requires an argument list");
        return "";
      }
      if (!literal) {
        const values = valuesFor();
        return values.arrayReference(this._runtime, list.map(values.decode));
      }
      // A new literal backing has no replaceable map/species construction.
      // The held decoder only interprets the freshly parsed root elements;
      // nested direct Arrays remain fresh JSON allocations, not callbacks.
      const body = [];
      for (let i = 0; i < list.length; i++) body[i] = allocationDecode(list[i]);
      access(this, {
        kind: "literal-body",
        slot: "VALUES",
        raw,
        body,
        parsed: list,
      });
      return allocationReference(this._runtime, body);
    }

    namedReference(args) {
      const array = currentOperation(this)
        ? currentOperation(this).body
        : arrays[namedKey(this, args, true)];
      if (!Array.isArray(array)) {
        this._error(
          "Named array does not exist: " + namedKey(this, args, true)
        );
        return valuesFor().UNDEFINED;
      }
      return valuesFor().arrayReference(this._runtime, array);
    }

    parseLegacyValue(args) {
      return this._arrayResult(this.parseValue(valuesFor().decode(args.VALUE)));
    }

    jsonValue(args) {
      const values = valuesFor();
      const stack = new Set();
      const unwrap = (value) => {
        access(this, { kind: "transport", slot: "VALUE", raw: value });
        value = values.decode(value);
        const id = values.referenceId(this._runtime, value, "array");
        if (values.isReference(value) && id === null) {
          throw new Error(
            "JSON text requires an array reference from this project"
          );
        }
        if (id !== null) {
          value = values.arrayValue(this._runtime, value);
          if (!value) throw new Error("Array reference is null or expired");
        }
        if (value && typeof value === "object") {
          if (currentOperation(this))
            bodyAccess(this, value, { kind: "read", slot: "VALUE" });
          if (stack.has(value)) {
            throw new Error("Converting circular structure to JSON");
          }
          stack.add(value);
          const result = Array.isArray(value)
            ? value.map(unwrap)
            : Object.fromEntries(
                Object.entries(value).map(([key, item]) => [key, unwrap(item)])
              );
          stack.delete(value);
          return result;
        }
        return value;
      };
      try {
        return values.encode(JSON.stringify(unwrap(args.VALUE)));
      } catch (error) {
        rethrowAccess(this, error);
        this._error(error.message);
        return values.UNDEFINED;
      }
    }

    referenceTruthy(args) {
      const array = this._array(args);
      return array ? Boolean(array[Number(args.INDEX)]) : false;
    }

    referenceItem(args) {
      const array = this._array(args);
      return array ? this._arrayResult(array[Number(args.INDEX)]) : "";
    }

    referenceRemove(args, util) {
      const array = this._array(args);
      if (!array) return false;
      const index = valuesFor().indexOf(
        array,
        valueInput(args, util, "arrays_referenceRemove", "VALUE")
      );
      if (index < 0) return false;
      if (currentOperation(this))
        mutateArray(this, array, "splice", array.splice, [index, 1]);
      else array.splice(index, 1);
      return true;
    }

    referenceRandom(args) {
      const array = this._array(args);
      return array
        ? this._arrayResult(array[Math.floor(Math.random() * array.length)])
        : "";
    }

    referenceLength(args) {
      const array = this._array(args);
      return array ? array.length : 0;
    }

    // Preserve PXT helpers.arraySlice/arrayConcat, not native JS slice/concat.
    // Source: Microsoft PXT common-packages, libs/base/pxt-helpers.ts, as
    // bundled by MakeCode Arcade 4.2.1. The helper loops preserve fractional
    // property reads, NaN bounds and shallow nested references.
    //
    // Copyright (c) Microsoft Corporation.
    // Permission is hereby granted, free of charge, to any person obtaining a
    // copy of this software and associated documentation files (the "Software"),
    // to deal in the Software without restriction, including without limitation
    // the rights to use, copy, modify, merge, publish, distribute, sublicense,
    // and/or sell copies of the Software, and to permit persons to whom the
    // Software is furnished to do so, subject to the following conditions:
    // The above copyright notice and this permission notice shall be included
    // in all copies or substantial portions of the Software.
    // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
    // OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    // FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
    // THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    // LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    // FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    // DEALINGS IN THE SOFTWARE.
    referenceSlice(args) {
      const array = this._array(args);
      if (!array) return "";
      const values = valuesFor();
      let start = values.decode(args.START);
      let end = values.decode(args.END);
      if (
        [start, end].some(
          (value) =>
            value !== null &&
            (typeof value === "object" || typeof value === "function")
        )
      ) {
        this._error("Array bounds cannot be opaque references or objects");
        return values.encode(undefined);
      }
      const length = array.length;
      const result = [];
      if (start === undefined) start = 0;
      else if (start < 0) start = Math.max(length + start, 0);
      if (start > length) return this._arrayResult(result);
      if (end === undefined) end = length;
      else if (end < 0) end = length + end;
      if (end > length) end = length;
      for (let index = start; index < end; ++index) result.push(array[index]);
      return this._arrayResult(result);
    }

    referenceConcat(args) {
      const array = this._array(args);
      if (!array) return "";
      const operation = currentOperation(this);
      const other = operation
        ? operation.other
        : this._array({ ARRAY: args.OTHER });
      if (operation && !other)
        this._error("Array reference is null or expired");
      if (!other) return "";
      const result = [];
      for (const value of array) result.push(value);
      for (const value of other) result.push(value);
      return this._arrayResult(result);
    }

    referenceIndexOf(args, util) {
      const array = this._array(args);
      return array
        ? valuesFor().indexOf(
            array,
            valueInput(args, util, "arrays_referenceIndexOf", "VALUE"),
            Number(args.INDEX)
          )
        : -1;
    }

    referenceTake(args) {
      const array = this._array(args);
      if (!array) return "";
      const index = Number(args.INDEX);
      const op = String(args.OP);
      if (op === "pop") {
        if (currentOperation(this))
          selectedValue(this, array[array.length - 1]);
        return this._arrayResult(
          currentOperation(this)
            ? mutateArray(this, array, "pop", array.pop, [])
            : array.pop()
        );
      }
      if (op === "shift") {
        if (currentOperation(this)) selectedValue(this, array[0]);
        return this._arrayResult(
          currentOperation(this)
            ? mutateArray(this, array, "shift", array.shift, [])
            : array.shift()
        );
      }
      if (op === "removeAt") {
        if (currentOperation(this))
          selectedValue(
            this,
            index >= 0 && index < array.length ? array[index] : undefined
          );
        return this._arrayResult(
          index >= 0 && index < array.length
            ? (currentOperation(this)
                ? mutateArray(this, array, "splice", array.splice, [index, 1])
                : array.splice(index, 1))[0]
            : undefined
        );
      }
      this._error("Unknown array reference operation " + op);
      return "";
    }

    mutateReference(args, util) {
      const array = this._array(args);
      if (!array) return;
      const values = valuesFor();
      const index = Number(args.INDEX);
      const value = values.decode(
        valueInput(args, util, "arrays_mutateReference", "VALUE")
      );
      switch (String(args.OP)) {
        case "push":
          currentOperation(this)
            ? mutateArray(this, array, "push", array.push, [value])
            : array.push(value);
          break;
        case "unshift":
          currentOperation(this)
            ? mutateArray(this, array, "unshift", array.unshift, [value])
            : array.unshift(value);
          break;
        case "set":
          array[index] = effectValue(this, value, array);
          break;
        case "insertAt":
          currentOperation(this)
            ? mutateArray(this, array, "splice", array.splice, [
                index,
                0,
                value,
              ])
            : array.splice(index, 0, value);
          break;
        case "removeAt":
          if (index >= 0 && index < array.length)
            currentOperation(this)
              ? mutateArray(this, array, "splice", array.splice, [index, 1])
              : array.splice(index, 1);
          break;
        case "pop":
          currentOperation(this)
            ? mutateArray(this, array, "pop", array.pop, [])
            : array.pop();
          break;
        case "shift":
          currentOperation(this)
            ? mutateArray(this, array, "shift", array.shift, [])
            : array.shift();
          break;
        case "removeElement": {
          const at = values.indexOf(array, value);
          if (at >= 0)
            currentOperation(this)
              ? mutateArray(this, array, "splice", array.splice, [at, 1])
              : array.splice(at, 1);
          break;
        }
        case "reverse":
          currentOperation(this)
            ? mutateArray(this, array, "reverse", array.reverse, [])
            : array.reverse();
          break;
        case "length":
          try {
            array.length = effectValue(this, Number(value), array);
          } catch (e) {
            rethrowAccess(this, e);
            this._error(e.message);
          }
          break;
        default:
          this._error("Unknown array reference mutation " + String(args.OP));
      }
    }

    // ========================================================================
    // TABLE DISPLAY
    //
    // Renders a stored array onto the stage as a grid, using an SVG skin on
    // the pen layer so sprites still draw over it. The renderer is optional:
    // every entry point tolerates its absence (Node tests, headless VM runs)
    // by keeping the table STATE and skipping only the draw, so a project
    // that marks cells off-screen still reports the right answers.
    // ========================================================================

    _tableState(name) {
      if (!tables[name]) {
        tables[name] = effectValue(
          this,
          {
            x: 0,
            y: 0,
            cellW: 44,
            cellH: 30,
            fontSize: 16,
            title: "",
            marks: {},
            skinId: null,
            drawableId: null,
            visible: false,
          },
          undefined,
          "read"
        );
      }
      return tables[name];
    }

    // A stored array as rows. A 1D array is one row; anything else is empty.
    _tableRows(name) {
      const operation = currentOperation(this);
      const value =
        operation && operation.name === name ? operation.body : arrays[name];
      if (!operation && Scratch.BWArrayOperations) {
        const service = Scratch.BWArrayOperations;
        if (typeof service.access !== "function")
          throw new Error("Invalid Array host guards");
        const seen = new Set();
        const inspect = (body, parent, key) => {
          service.access(
            undefined,
            Object.freeze({
              opcode: null,
              runtime: this._runtime,
              kind: "read",
              slot: "NAME",
              raw: name,
              name,
              body,
              parent,
              key,
            })
          );
          if (!body || typeof body !== "object" || seen.has(body)) return;
          seen.add(body);
          for (const key of Reflect.ownKeys(body)) {
            const descriptor = Object.getOwnPropertyDescriptor(body, key);
            if (!descriptor || !("value" in descriptor))
              throw new Error(
                "Array host guards require data-only aggregate properties"
              );
            if (descriptor.value && typeof descriptor.value === "object")
              inspect(descriptor.value, body, key);
          }
        };
        inspect(value);
      }
      if (!Array.isArray(value)) return [];
      if (value.length === 0) return [];
      return Array.isArray(value[0]) ? value.filter(Array.isArray) : [value];
    }

    _esc(text) {
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    // Pure: rows + state in, SVG out. Kept free of renderer calls so it can be
    // asserted directly rather than through a GL context.
    _tableSVG(rows, st) {
      const cols = rows.reduce(
        (widest, row) => Math.max(widest, row.length),
        0
      );
      if (!rows.length || !cols) return null;
      const cw = Math.max(8, Number(st.cellW) || 44);
      const ch = Math.max(8, Number(st.cellH) || 30);
      const fs = Math.max(4, Number(st.fontSize) || 16);
      const pad = 4;
      const titleH = st.title ? fs + 8 : 0;
      const w = cols * cw + pad * 2;
      const h = rows.length * ch + pad * 2 + titleH;
      const parts = [];
      parts.push(
        '<svg xmlns="http://www.w3.org/2000/svg" width="' +
          w +
          '" height="' +
          h +
          '" viewBox="0 0 ' +
          w +
          " " +
          h +
          '">'
      );
      parts.push(
        '<rect x="0" y="0" width="' +
          w +
          '" height="' +
          h +
          '" rx="6" fill="#ffffff" fill-opacity="0.92" stroke="#4c4c4c" stroke-width="2"/>'
      );
      if (st.title) {
        parts.push(
          '<text x="' +
            w / 2 +
            '" y="' +
            (pad + fs) +
            '" font-family="sans-serif" font-size="' +
            fs +
            '" font-weight="bold" text-anchor="middle" fill="#111111">' +
            this._esc(st.title) +
            "</text>"
        );
      }
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols; c++) {
          const x = pad + c * cw;
          const y = pad + titleH + r * ch;
          const marked = st.marks[r + 1 + "," + (c + 1)] === true;
          parts.push(
            '<rect x="' +
              x +
              '" y="' +
              y +
              '" width="' +
              cw +
              '" height="' +
              ch +
              '" fill="' +
              (marked ? "#ff8c1a" : "#f2f2f2") +
              '" stroke="#4c4c4c" stroke-width="1"/>'
          );
          const cell = rows[r][c];
          if (cell !== undefined && cell !== null && cell !== "") {
            parts.push(
              '<text x="' +
                (x + cw / 2) +
                '" y="' +
                (y + ch / 2 + fs * 0.35) +
                '" font-family="sans-serif" font-size="' +
                fs +
                '" text-anchor="middle" fill="' +
                (marked ? "#ffffff" : "#111111") +
                '">' +
                this._esc(cell) +
                "</text>"
            );
          }
        }
      }
      parts.push("</svg>");
      return parts.join("");
    }

    _renderer() {
      try {
        return (
          (Scratch.vm && Scratch.vm.runtime && Scratch.vm.runtime.renderer) ||
          null
        );
      } catch (e) {
        rethrowAccess(this, e);
        return null;
      }
    }

    // Redraw a table that is currently shown. Silent when hidden or headless.
    _redrawTable(name) {
      const st = tables[name];
      if (!st || !st.visible) return;
      const renderer = this._renderer();
      if (!renderer) return;
      const svg = this._tableSVG(this._tableRows(name), st);
      if (svg === null) return;
      try {
        effectValue(this, undefined, undefined, "read");
        if (st.skinId === null) {
          st.skinId = effectValue(
            this,
            renderer.createSVGSkin(svg),
            undefined,
            "read"
          );
          effectValue(this, undefined, undefined, "read");
          st.drawableId = effectValue(
            this,
            renderer.createDrawable("pen"),
            undefined,
            "read"
          );
          effectValue(this, undefined, undefined, "read");
          renderer.updateDrawableSkinId(st.drawableId, st.skinId);
        } else {
          effectValue(this, undefined, undefined, "read");
          renderer.updateSVGSkin(st.skinId, svg);
        }
        effectValue(this, undefined, undefined, "read");
        renderer.updateDrawablePosition(st.drawableId, [st.x, st.y]);
        effectValue(this, undefined, undefined, "read");
        renderer.updateDrawableVisible(st.drawableId, true);
      } catch (e) {
        rethrowAccess(this, e);
        // A renderer that refuses a skin must not take the project down with
        // it: the table stays in STATE, so marks and reporters keep working.
      }
    }

    showTable(args) {
      const name = namedKey(this, args, true);
      const st = this._tableState(name);
      st.x = effectValue(this, Number(args.X) || 0, undefined, "read");
      st.y = effectValue(this, Number(args.Y) || 0, undefined, "read");
      st.visible = effectValue(this, true, undefined, "read");
      this._redrawTable(name);
    }

    hideTable(args) {
      const st = tables[namedKey(this, args, true)];
      if (!st) return;
      st.visible = effectValue(this, false, undefined, "read");
      const renderer = this._renderer();
      if (!renderer || st.drawableId === null) return;
      try {
        effectValue(this, undefined, undefined, "read");
        renderer.updateDrawableVisible(st.drawableId, false);
      } catch (e) {
        rethrowAccess(this, e);
        // Already gone (project reload destroyed it); nothing to hide.
      }
    }

    setTableTitle(args) {
      this._tableState(namedKey(this, args, true)).title = effectValue(
        this,
        String(args.TITLE),
        undefined,
        "read"
      );
      this._redrawTable(namedKey(this, args, true));
    }

    setTableStyle(args) {
      const st = this._tableState(namedKey(this, args, true));
      st.cellW = effectValue(this, Number(args.W) || 44, undefined, "read");
      st.cellH = effectValue(this, Number(args.H) || 30, undefined, "read");
      st.fontSize = effectValue(
        this,
        Number(args.SIZE) || 16,
        undefined,
        "read"
      );
      this._redrawTable(namedKey(this, args, true));
    }

    markCell(args) {
      const name = namedKey(this, args, true);
      this._tableState(name).marks[
        Math.round(Number(args.ROW)) + "," + Math.round(Number(args.COL))
      ] = effectValue(this, true, undefined, "read");
      this._redrawTable(name);
    }

    unmarkCell(args) {
      const name = namedKey(this, args, true);
      const marks = this._tableState(name).marks;
      const key =
        Math.round(Number(args.ROW)) + "," + Math.round(Number(args.COL));
      effectValue(this, undefined, undefined, "read");
      delete marks[key];
      this._redrawTable(name);
    }

    clearMarks(args) {
      const name = namedKey(this, args, true);
      this._tableState(name).marks = effectValue(this, {}, undefined, "read");
      this._redrawTable(name);
    }

    isMarked(args) {
      const st = tables[namedKey(this, args, true)];
      if (!st) return false;
      return (
        st.marks[
          Math.round(Number(args.ROW)) + "," + Math.round(Number(args.COL))
        ] === true
      );
    }

    markedCount(args) {
      const st = tables[namedKey(this, args, true)];
      return st ? Object.keys(st.marks).length : 0;
    }
  }

  for (const [opcode, spec] of Object.entries(operationSpecs)) {
    const original = ArrayExtension.prototype[opcode];
    ArrayExtension.prototype[opcode] = function (args, util) {
      const service = Scratch.BWArrayOperations;
      if (
        service === undefined ||
        service === null ||
        (opcode === "valueBinary" &&
          ((typeof args?.OP === "string" && args.OP !== "+") ||
            scalarBinaryInputs(args)))
      ) {
        return original.call(this, args, util);
      }
      const host = {
        begin: service.begin,
        access: service.access,
        finish: service.finish,
      };
      if (Object.values(host).some((fn) => typeof fn !== "function")) {
        throw new Error("Invalid Array host guards");
      }
      const previous = currentOperation(this);
      const operation = {
        service,
        host,
        args,
        opcode,
        spec,
        rejections: [],
        primitive: opcode === "valueBinary" ? service.primitive : undefined,
      };
      operation.ticket = allocationApply(host.begin, service, [
        opcode,
        args,
        util,
      ]);
      allocationApply(operationSet, operations, [this, operation]);
      let result,
        failure,
        failed = true;
      try {
        if (
          args &&
          Object.values(Object.getOwnPropertyDescriptors(args)).some(
            (descriptor) => !("value" in descriptor)
          )
        ) {
          rejectAccess(
            this,
            "Array host guards require data-only operation arguments"
          );
        }
        // Raw transports are checked before resolution can normalize wrappers.
        access(this, { kind: "transport", slot: null, raw: args });
        if (spec[0] === "named" || spec[0] === "namedString") {
          const rawName = args.NAME;
          operation.name =
            spec[0] === "namedString" ? String(rawName) : propertyKey(rawName);
          operation.body = arrays[operation.name];
          bodyAccess(
            this,
            operation.body,
            { slot: "NAME", raw: rawName, name: operation.name },
            spec[2]
          );
        } else if (spec[0] === "reference") {
          access(this, { kind: "transport", slot: "ARRAY", raw: args.ARRAY });
          operation.body = valuesFor().arrayValue(this._runtime, args.ARRAY);
          bodyAccess(this, operation.body, { slot: "ARRAY", raw: args.ARRAY });
          if (opcode === "referenceConcat") {
            access(this, { kind: "transport", slot: "OTHER", raw: args.OTHER });
            operation.other = valuesFor().arrayValue(this._runtime, args.OTHER);
            bodyAccess(this, operation.other, {
              slot: "OTHER",
              raw: args.OTHER,
            });
          }
        } else if (spec[0] === "registry") {
          for (const name of Object.keys(arrays)) {
            access(this, { slot: "NAME", name, body: arrays[name] });
          }
        }
        result = allocationApply(original, this, [args, util]);
        failed = false;
        return result;
      } catch (error) {
        failure = error;
        throw error;
      } finally {
        try {
          // Finish is cleanup/verification only: its return value is ignored.
          allocationApply(host.finish, service, [
            operation.ticket,
            result,
            allocationFreeze({
              opcode,
              runtime: this._runtime,
              status: failed ? "throw" : "return",
              error: failure,
              body: failed
                ? undefined
                : spec[0] === "named" || spec[0] === "namedString"
                  ? arrays[operation.name]
                  : allocationBody(this._runtime, result),
            }),
          ]);
        } finally {
          if (previous)
            allocationApply(operationSet, operations, [this, previous]);
          else allocationApply(operationDelete, operations, [this]);
        }
      }
    };
  }

  Scratch.extensions.register(new ArrayExtension());

  // A project load disposes the runtime and takes every drawable with it. Drop
  // our handles so the next `show table` builds a fresh skin rather than
  // updating an id the renderer has already freed -- which throws, and used to
  // leave the board invisible with no error the learner could act on.
  try {
    Scratch.vm.runtime.on("RUNTIME_DISPOSED", () => {
      for (const name of Object.keys(tables)) {
        tables[name].skinId = null;
        tables[name].drawableId = null;
        tables[name].visible = false;
      }
    });
  } catch (e) {
    // No runtime to listen on (unit tests); nothing to reset.
  }
})(Scratch);
