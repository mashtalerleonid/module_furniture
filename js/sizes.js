const toolsEl = document.querySelector("#tools");
const titleEl = document.querySelector("#title");
const widthInp = document.querySelector("#widthInp");
const heightInp = document.querySelector("#heightInp");
const depthInp = document.querySelector("#depthInp");
const elevationInp = document.querySelector("#elevationInp");
const widthUpEl = document.querySelector("#widthUp");
const widthDownEl = document.querySelector("#widthDown");
const heightUpEl = document.querySelector("#heightUp");
const heightDownEl = document.querySelector("#heightDown");
const depthUpEl = document.querySelector("#depthUp");
const depthDownEl = document.querySelector("#depthDown");
const elevationUpEl = document.querySelector("#elevationUp");
const elevationDownEl = document.querySelector("#elevationDown");
const wrapSVG = document.querySelector("#wrapSVG");
const lockSVG = document.querySelector("#lockSVG");
const unlockSVG = document.querySelector("#unlockSVG");
const materialsGrid = document.querySelector("#materialsGrid");

const dims = ["width", "height", "depth"];
const dimContainers = {
    width: document.querySelector("#widthContainer"),
    height: document.querySelector("#heightContainer"),
    depth: document.querySelector("#depthContainer"),
};

function stopInterval() {
    clearInterval(intervalId);
    delay = 0;
}

function updateInputs() {
    widthInp.value = Math.round(curParams.width * 10) / 10;
    heightInp.value = Math.round(curParams.height * 10) / 10;
    depthInp.value = Math.round(curParams.depth * 10) / 10;
    elevationInp.value = Math.round(curParams.elevation * 10) / 10;
}

function mousePressedListener(type, delta) {
    let k = delta === "inc" ? 1 : -1;
    value = curParams[type] + k * 1;
    sizeChanged(type, value);

    if (intervalId) stopInterval();

    intervalId = setInterval(() => {
        if (delay < firstDelay) {
            delay += 1;
        } else {
            value = curParams[type] + k * 1;
            sizeChanged(type, value);
        }
    }, 100);
}

function checkLimits(type, value) {
    let checkedVal = value;
    if (value < dimLimits[type].min) {
        checkedVal = dimLimits[type].min;
    } else if (value > dimLimits[type].max) {
        checkedVal = dimLimits[type].max;
    }
    return checkedVal;
}

function sizeChanged(type, value) {
    value = checkLimits(type, value);
    if (value === curParams[type]) {
        updateInputs();
        return;
    }

    curParams[type] = value;

    switch (type) {
        case "width":
            if (isLocked) {
                const scale = value / configurator.sceneObject.defaultWidth;
                curParams.height = configurator.sceneObject.defaultHeight * scale;
                curParams.depth = configurator.sceneObject.defaultDepth * scale;
            }
            break;
        case "height":
            if (isLocked) {
                const scale = value / configurator.sceneObject.defaultHeight;
                curParams.width = configurator.sceneObject.defaultWidth * scale;
                curParams.depth = configurator.sceneObject.defaultDepth * scale;
            }
            break;
        case "depth":
            if (isLocked) {
                const scale = value / configurator.sceneObject.defaultDepth;
                curParams.width = configurator.sceneObject.defaultWidth * scale;
                curParams.height = configurator.sceneObject.defaultHeight * scale;
            }
            break;
        // case "elevation":
        //     break;
        default:
            break;
    }
    configurator.updateModel(curParams);
    // configurator.PH.updateCameraSettings(configurator.sceneObject, false);
    updateInputs();
}

// WIDTH

widthInp.addEventListener("click", (e) => {
    e.target.select();
});

widthInp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        value = Number(widthInp.value) || curParams.width;
        sizeChanged("width", value);
        e.target.blur();
    }
});

widthInp.addEventListener("blur", (e) => {
    value = Number(widthInp.value) || curParams.width;
    sizeChanged("width", value);
});

widthUpEl.addEventListener("mousedown", () => {
    mousePressedListener("width", "inc");
});

widthDownEl.addEventListener("mousedown", () => {
    mousePressedListener("width", "dec");
});

widthUpEl.addEventListener("mouseup", stopInterval);
widthUpEl.addEventListener("mouseleave", stopInterval);
widthDownEl.addEventListener("mouseup", stopInterval);
widthDownEl.addEventListener("mouseleave", stopInterval);

// HEIGHT

heightInp.addEventListener("click", (e) => {
    e.target.select();
});

heightInp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        value = Number(heightInp.value) || curParams.height;
        sizeChanged("height", value);
        e.target.blur();
    }
});

heightInp.addEventListener("blur", (e) => {
    value = Number(heightInp.value) || curParams.height;
    sizeChanged("height", value);
});

heightUpEl.addEventListener("mousedown", () => {
    mousePressedListener("height", "inc");
});

heightDownEl.addEventListener("mousedown", () => {
    mousePressedListener("height", "dec");
});

heightUpEl.addEventListener("mouseup", stopInterval);
heightUpEl.addEventListener("mouseleave", stopInterval);
heightDownEl.addEventListener("mouseup", stopInterval);
heightDownEl.addEventListener("mouseleave", stopInterval);

// DEPTH

depthInp.addEventListener("click", (e) => {
    e.target.select();
});

depthInp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        value = Number(depthInp.value) || curParams.depth;
        sizeChanged("depth", value);
        e.target.blur();
    }
});

depthInp.addEventListener("blur", (e) => {
    value = Number(depthInp.value) || curParams.depth;
    sizeChanged("depth", value);
});

depthUpEl.addEventListener("mousedown", () => {
    mousePressedListener("depth", "inc");
});

depthDownEl.addEventListener("mousedown", () => {
    mousePressedListener("depth", "dec");
});

depthUpEl.addEventListener("mouseup", stopInterval);
depthUpEl.addEventListener("mouseleave", stopInterval);
depthDownEl.addEventListener("mouseup", stopInterval);
depthDownEl.addEventListener("mouseleave", stopInterval);

// ELEVATION

elevationInp.addEventListener("click", (e) => {
    e.target.select();
});

elevationInp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        curParams.elevation = Number(elevationInp.value) || curParams.elevation;
        e.target.blur();
    }
});

elevationInp.addEventListener("blur", (e) => {
    curParams.elevation = Number(elevationInp.value) || curParams.elevation;
    configurator.updateModel(curParams);
    updateInputs();
});

elevationUpEl.addEventListener("mousedown", () => {
    mousePressedListener("elevation", "inc");
});

elevationDownEl.addEventListener("mousedown", () => {
    mousePressedListener("elevation", "dec");
});

elevationUpEl.addEventListener("mouseup", stopInterval);
elevationUpEl.addEventListener("mouseleave", stopInterval);
elevationDownEl.addEventListener("mouseup", stopInterval);
elevationDownEl.addEventListener("mouseleave", stopInterval);

//

wrapSVG.addEventListener("click", () => {
    isLocked = !isLocked;
    lockSVG.classList.toggle("hidden");
    unlockSVG.classList.toggle("hidden");
});
