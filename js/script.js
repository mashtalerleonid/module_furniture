let urlMaterials = R2D.URL.DOMAIN + R2D.URL.CATALOG_MATERIALS_TREE_FOR_MODELS;

// const plannerContainer = document.querySelector("#configurator-container");
const plannerContainer = document.createElement("div");
plannerContainer.id = "configurator-container";

let configurator = null;

let value = 0;
let curParams = {};
let dimLimits = {
    width: { min: 1, max: Infinity },
    height: { min: 1, max: Infinity },
    depth: { min: 1, max: Infinity },
    elevation: { min: 0, max: Infinity },
};
let dimsToDisable = [];
let isLocked = false;

const firstDelay = 3;
let delay = 0;
let intervalId = null;

let selectedMeshIndex = -1;
let selectedHash = "";
let modelMatData = null;
let treeMaterial = null;

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

const script = document.createElement("script");
script.src = `${R2D.URL.DOMAIN}/src_designer/js/three.min.js?v=${appVersion || getRandomInt(100)}`;
document.body.appendChild(script);
script.onload = onTHREELoaded;

const hideImg = document.querySelector("#hideImg");

function onTHREELoaded() {
    const script = document.createElement("script");
    script.src = `${R2D.URL.DOMAIN}/src_designer/js/tris.js?v=${appVersion || getRandomInt(100)}`;
    document.body.appendChild(script);
    script.onload = onThrisLoaded;
}

function onThrisLoaded() {
    const script = document.createElement("script");
    // script.src = "http://localhost:9000/src_designer/js/plannercore.js?v=10"; //для локальної розробки
    script.src = `${R2D.URL.DOMAIN}/src_designer/js/plannercore.js?v=${appVersion || getRandomInt(100)}`;
    document.body.appendChild(script);
    script.onload = onPlannercoreLoaded;
}

function onPlannercoreLoaded() {
    // if (isLocalHost) return; //розкоментувати для запуску кон-ра в планері запущеному на localhost:9000 з http://127.0.0.1:5500/

    configurator = new Configurator(plannerContainer, R2D);

    configurator.addEventListener("clearCurMaterialsMarkup", clearCurMaterialsMarkupListener);
    configurator.addEventListener("updateCurMaterialsMarkup", updateCurMaterialsMarkupListener);
    configurator.addEventListener("renderSettingsContainer", renderSettingsContainer);

    window.parent.postMessage(
        JSON.stringify({
            action: "check_parent",
        }),
        "*"
    );

    fetchMaterialTree().then(() => {
        configurator.startGroup(models);
    });
}

// для локальної розробки розкоментувати
/*
let configInfo = null;
let isLocalHost = true;
let modelId = "34627";
const materials = [
    {
        name: "mesh_1_base",
        hash: "c487bcd3ae65846915439dc8d67c3938",
        default: 2594,
        current: 2594,
        source: "bank",
    },
    {
        name: "mesh_0_top",
        hash: "d8fe9d6adbd017b2dda599eefd1976f1",
        default: "#b77606",
        current: "#b77606",
        source: "bank",
        addMaterial: 32741,
    },
    {
        name: "mesh_2_doors",
        hash: "48c58ca1fed8e743bebba1f73adbb954",
        default: 536,
        current: 536,
        source: "bank",
    },
    {
        name: "mesh_4_legs",
        hash: "d833cf261812ea540dbd5481cfd73820",
        default: 769,
        current: 769,
        source: "bank",
    },
    {
        name: "mesh_3_h_1_1",
        hash: "35f8197c661388c97dab99b130db78ed",
        default: 2411,
        current: 2411,
        source: "none",
    },
    {
        name: "mesh_3_h_1_1001",
        hash: "bd8e5aaa84304c258331b98cd99fbc2b",
        default: 2411,
        current: 2411,
        source: "none",
    },
];

let models = [{ modelId, configInfo: { params: {}, materials } }];
*/

// if (isLocalHost) {
//     window.addEventListener("message", (e) => {
//         if (!e.data || typeof e.data !== "string" || e.data.startsWith("/*framebus*/")) return;
/*
        const data = JSON.parse(e.data);
        console.log("data", data);
        if (data.action === "start_configurate_localhost") {
            isLocalHost = false;

            if (data.models) {
                models = data.models;
            } else {
                models = [{ modelId: data.modelId, configInfo: data.configInfo }];
            }

            onPlannercoreLoaded();
        }
*/
//     });
// }
// -----------
