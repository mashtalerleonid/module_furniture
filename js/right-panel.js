const rpContainerEl = document.querySelector(".right-panel__container");
const navEl = document.querySelector(".rp__nav");
const navBackBtn = document.querySelector(".nav__btn");
const navBackIcon = document.querySelector(".nav__icon");
const navTitleEl = document.querySelector(".nav__title");
const dynamicContainerEl = document.querySelector(".dynamic__container");
const changeSizeWr = document.querySelector(".changeSizeWr");

let settingsContainerEl = document.createElement("div");
settingsContainerEl.classList.add("model-settings__container");

const colorpickerContEl = document.createElement("div");
colorpickerContEl.classList.add("colorpicker__container");
const colorpickerEl = document.createElement("input");
colorpickerEl.type = "color";
colorpickerEl.id = "colorpicker";
colorpickerEl.value = "#ff0000";
colorpickerEl.classList.add("colorpicker");

const closeBtn = document.querySelector("#closeBtn");
// const applyBtn = document.querySelector("#applyBtn");
const copyBtn = document.querySelector("#copyBtn");
const productHover = document.querySelector("#product_hover");

let materialsListEl = document.createElement("div");

let curMaterialsListEl = document.createElement("div");
curMaterialsListEl.classList.add("materials__list");

let propListEl = document.createElement("div");
propListEl.classList.add("prop__list");

// ---- SET/REMOVE LISTENERS ----
navBackBtn.addEventListener("click", onNavBackBtnClick);

colorpickerEl.addEventListener("input", (e) => {
    const color = e.target.value;
    configurator.setColor(selectedHash, color);
});

closeBtn.addEventListener("click", () => {
    configurator.close();
});

// applyBtn.addEventListener("click", () => {
//     configurator.insertToPlanner();
// });

copyBtn.addEventListener("click", () => {
    configurator.copyModelToGlobalClipboard();
});

window.addEventListener("message", (e) => {
    if (!e.data || typeof e.data !== "string" || e.data.startsWith("/*framebus*/")) return;

    let messageObj = null;

    try {
        messageObj = JSON.parse(e.data);
    } catch (error) {
        console.error("Error parse JSON string!");
        return;
    }

    if (messageObj.action == "parent") {
        configurator.isPlanner = true;
    } else if (messageObj.action == "get_AR_src") {
        configurator.getURLforAR(messageObj.qrSize);
    }
});

function setSubpropItemsListeners() {
    document.querySelectorAll(".subprop__item").forEach((item) => {
        item.addEventListener("click", onSubpropItemClick);
        item.addEventListener("mouseover", onProductHoverShow);
        item.addEventListener("mouseout", onProductHoverHide);
    });
}

function removeSubpropItemsListeners() {
    document.querySelectorAll(".subprop__item").forEach((item) => {
        item.removeEventListener("click", onSubpropItemClick);
        item.removeEventListener("mouseover", onProductHoverShow);
        item.removeEventListener("mouseout", onProductHoverHide);
    });
}

function setCurMaterialsListener() {
    document.querySelector(".materials__list").addEventListener("click", onCurMaterialClick);
    document.querySelectorAll(".cur-material").forEach((matDom) => {
        matDom.addEventListener("mouseenter", onCurMaterialMouseEnter);
        matDom.addEventListener("mouseover", onProductHoverShow);
        matDom.addEventListener("mouseout", onProductHoverHide);
    });
    document.querySelectorAll(".cur-material").forEach((matDom) => {
        matDom.addEventListener("mouseleave", onCurMaterialMouseLeave);
    });
}

function removeCurMaterialsListener() {
    document.querySelector(".materials__list").removeEventListener("click", onCurMaterialClick);
    document.querySelectorAll(".cur-material").forEach((matDom) => {
        matDom.removeEventListener("mouseenter", onCurMaterialMouseEnter);
        matDom.removeEventListener("mouseover", onProductHoverShow);
        matDom.removeEventListener("mouseout", onProductHoverHide);
    });
    document.querySelectorAll(".cur-material").forEach((matDom) => {
        matDom.removeEventListener("mouseleave", onCurMaterialMouseLeave);
    });
}

function setMaterialsListener() {
    document.querySelector(".products__list").addEventListener("click", onMaterialClick);
    document.querySelectorAll(".product").forEach((matDom) => {
        matDom.addEventListener("mouseover", onProductHoverShow);
        matDom.addEventListener("mouseout", onProductHoverHide);
    });
}

function removeMaterialsListener() {
    document.querySelector(".products__list")?.removeEventListener("click", onMaterialClick);
    document.querySelectorAll(".product").forEach((matDom) => {
        matDom.removeEventListener("mouseover", onProductHoverShow);
        matDom.removeEventListener("mouseout", onProductHoverHide);
    });
}

// ---- FETCH ----
async function fetchMaterialTree() {
    const response = await fetch(urlMaterials);
    const data = await response.json();
    treeMaterial = data.materials;
    return;
}

async function fetchByUrlList(urlList) {
    if (!urlList) return [];

    try {
        const response = await fetch(R2D.URL.DOMAIN + urlList);
        const data = await response.json();
        return data;
    } catch (error) {
        console.log(error);
        return [];
    }
}

async function fetchBySet(setId) {
    try {
        const response = await fetch(
            `${R2D.URL.DOMAIN}${R2D.URL.URL_GET_MATERIALS_SET}&set_id=${setId}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.log(error);
        return [];
    }
}

// ---- LISTENERS ----

async function updateCurMaterialsMarkupListener() {
    removeCurMaterialsListener();

    modelMatData = await configurator.getMatDataForMarkup();
    const curMaterialsListMarkup = modelMatData
        .map(
            ({ prevSrc, index, hash, name, id }) =>
                `<div class="cur-material" data-title=${name} data-id=${id}>
                    <img src=${prevSrc} alt="" data-index=${index} data-hash=${hash}/>
                </div>`
        )
        .join("");
    curMaterialsListEl.innerHTML = curMaterialsListMarkup;

    setCurMaterialsListener();
}

function clearCurMaterialsMarkupListener() {
    curMaterialsListEl.innerHTML = "";
}

function onSubpropItemClick(e) {
    e.currentTarget.parentElement.querySelectorAll(".subprop__item").forEach((item) => {
        item.classList.remove("subprop__item--active");
    });
    e.currentTarget.classList.add("subprop__item--active");
    const id = e.currentTarget.dataset.id;
    const hash = e.currentTarget.dataset.hash;

    if (hash == 0) {
        // замінити модель
        configurator.replaceModel(id);
    } else if (id == 0) {
        //сховати меш
        configurator.hideMesh(hash);
    } else {
        // замінити меш
        configurator.startReplaceGroupMesh(id, hash);
    }
}

function onProductHoverShow(e) {
    let productTitle = e.currentTarget.getAttribute("data-title");
    //let productTitle = 'Тут назва якась назва ручки бла бла';
    let productIndex = Array.from(e.currentTarget.parentNode.children).indexOf(e.currentTarget) + 1;
    let productText = e.currentTarget.getAttribute("data-text");
    const productRect = e.currentTarget.getBoundingClientRect();
    const productTop = productRect.top + window.scrollY;
    const productLeft = productRect.left + window.scrollX;
    const productWidth = e.currentTarget.offsetWidth;
    const productHoverWidth = productHover.offsetWidth;

    if (productIndex % 2 === 0) {
        productHover.classList.add('product_hover_left');
        productHover.style.top = `${productTop}px`;
        productHover.style.left = `${productLeft + productWidth + productHoverWidth + 10}px`;
    } else {
        productHover.classList.remove('product_hover_left');
        productHover.style.top = `${productTop}px`;
        productHover.style.left = `${productLeft - 10}px`;
    }


    if (productTitle) {
        const titleEl = document.createElement("div");
        titleEl.className = "subprop__item__title";
        titleEl.textContent = productTitle;
        productHover.append(titleEl);
    }

    if (productText) {
        const textEl = document.createElement("div");
        textEl.className = "subprop__item__text";
        textEl.textContent = productText;
        productHover.append(textEl);
    }
    /*  productHover.innerHTML = `
        <div class="subprop__item__title">${productTitle}</div>
        <div class="subprop__item__text">${productText}</div>
    `;*/



    productTitle || productText ? productHover.style.display = "block" : null;
}

function onProductHoverHide(e) {
    productHover.style.display = "none";
    productHover.innerHTML = "";
}

async function onCurMaterialClick(e) {
    let curMatId = e.target.closest(".cur-material")?.getAttribute("data-id");
    const getMeshMatDataByHash = (hash) => modelMatData.find((el) => el.hash === hash);
    // --------------------
    selectedHash = e.target.dataset.hash;
    if (!selectedHash) return;

    selectedMeshIndex = e.target.dataset.index;

    const source = getMeshMatDataByHash(selectedHash).source;
    const isColorpicker = getMeshMatDataByHash(selectedHash).isColorpicker === "1";
    const name = getMeshMatDataByHash(selectedHash).name;

    removeCurMaterialsListener();
    removeSubpropItemsListeners();

    if (source === "bank") {
        if (isColorpicker) {
            const color = getMeshMatDataByHash(selectedHash).color;
            renderColorpicker(name, color);
        } else {
            const urlList = getMeshMatDataByHash(selectedHash).urlList;
            const data = await fetchByUrlList(urlList);
            if (data.products) {
                renderMaterials(data.products, name, curMatId);
            } else {
                setCurMaterialsListener();
            }
        }
    } else if (source === "set") {
        const setId = getMeshMatDataByHash(selectedHash).setId;
        const data = await fetchBySet(setId);
        if (data.products) {
            renderMaterials(data.products, data.data.name, curMatId);
        } else {
            setCurMaterialsListener();
        }
    }
    onProductHoverHide();
}

function onCurMaterialMouseEnter(e) {
    // selectedHash = e.target.querySelector("img").dataset.hash;
    // if (selectedHash) {
    //     configurator.setMeshActive(selectedHash);
    // } else {
    //     configurator.unsetMeshActive();
    // }
}

function onCurMaterialMouseLeave() {
    // configurator.unsetMeshActive();
}

function onMaterialClick(e) {
    const productId = e.target.dataset.id;
    if (!productId) return;
    const allParents = document.querySelectorAll(".product");
    allParents.forEach((el) => el.classList.remove("product_active"));

    e.target.parentElement.classList.add("product_active");
    configurator.setGroupMaterialAt(selectedHash, productId, "current");
}

function onNavBackBtnClick(e) {
    removeMaterialsListener();
    renderSettingsContainer("to-right");
}

// ---- RENDER MARKUP ----

function slide({ elHide, elShow, navTitle = "", side = "to-left", isBackBtn = false }) {
    elShow.style.left = side === "to-left" ? "100%" : "-100%";

    setTimeout(() => {
        navTitleEl.textContent = navTitle;
        //navTitleEl.textContent = 'тут невьєбенна довга назва, яку я має врахувати при версці не то отримаю люлєй';
        if (isBackBtn) {
            navBackBtn.classList.remove("hidden");
            closeBtn.classList.add("hidden");
        } else {
            navBackBtn.classList.add("hidden");
            closeBtn.classList.remove("hidden");
        }

        elShow.style.left = "0";
        elHide.style.left = side === "to-left" ? "-100%" : "100%";
        setTimeout(() => {
            dynamicContainerEl.scrollTop = 0;
        }, 150);
        setTimeout(() => {
            elHide.remove();
        }, 300);
    }, 50);
}

async function renderSettingsContainer(side = "to-left") {
    settingsContainerEl.innerHTML = "";
    propListEl.innerHTML = "";

    if (configurator.isPlanner) {
    } else {
        copyBtn.classList.remove("hidden");
    }

    if (configurator.sceneObject.isParametric) {
        settingsContainerEl.append(changeSizeWr);
        changeSizeWr.classList.remove("hidden");
        updateInputs();
    }

    // заміна цілої моделі
    if (configurator.modelData?.modelsForReplace.length > 0) {
        propListEl.append(getPropItemEl(configurator.modelData));
    }
    // заміна мешей
    Object.entries(configurator.meshesData).forEach(([hash, data]) => {
        if (data.modelsForReplace?.length) {
            propListEl.append(getPropItemEl(data, hash));
        }
    });
    settingsContainerEl.append(propListEl);
    //

    modelMatData = await configurator.getMatDataForMarkup();
    const curMaterialsListMarkup = modelMatData
        .map(
            ({ prevSrc, index, hash, name, id }) =>
                `<div class="cur-material" data-title=${name} data-id=${id}>
                    <img src=${prevSrc} alt="" data-index=${index} data-hash=${hash} />
                </div>`
        )
        .join("");
    curMaterialsListEl.innerHTML = curMaterialsListMarkup;
    settingsContainerEl.append(curMaterialsListEl);
    dynamicContainerEl.append(settingsContainerEl);

    setSubpropItemsListeners();
    setCurMaterialsListener();

    slide({
        elHide: colorpickerContEl.parentElement ? colorpickerContEl : materialsListEl,
        elShow: settingsContainerEl,
        navTitle:
            configurator.configData.model.title ||
            configurator.PH.getModelName(configurator.startModelId),
        side: side,
        isBackBtn: false,
    });

    // configurator.unsetMeshActive();

    // ---functions---

    function getPropItemEl(data, hash = 0) {
        const propItemEl = document.createElement("div");
        propItemEl.classList.add("prop__item");

        const subpropListEl = getSubpropListEl(data, hash);
        propItemEl.append(subpropListEl);

        return propItemEl;
    }

    function getSubpropListEl(data, hash) {
        const subpropListEl = document.createElement("div");
        subpropListEl.classList.add("subprop__list");

        let markup = data.modelsForReplace
            .map((itemData) => {
                const src = configurator.PH.getPrevSrc(itemData.id);
                const modelName = configurator.PH.getModelName(itemData.id);

                return src
                    ? `<div class="subprop__item" data-id="${
                          itemData.id
                      }" data-hash="${hash}" data-title="${
                          itemData.title || modelName || ""
                      }" data-text="${itemData.text}">
                        <div class="subprop__item__thumb">
                            <img src=${src} alt="" />
                        </div>
                    </div>`
                    : `<div class="subprop__item" data-id="${itemData.id}" data-hash="${hash}">
                        <div class="subprop__item__descr">
                            <div class="subprop__item__title">
                                ${itemData.title || modelName || ""}
                            </div>
                            <div class="subprop__item__text">${itemData.text}</div>
                        </div>
                    </div>`;
            })
            .join("");

        subpropListEl.insertAdjacentHTML("beforeend", markup);
        subpropListEl
            .querySelector(`[data-id="${data.curId}"]`)
            .classList.add("subprop__item--active");

        return subpropListEl;
    }
}

function renderMaterials(products, prevName, curMatId) {
    const productsMarkup = products
        .map(({ id, source, name }) => {
            const isActive = id == curMatId ? "product_active" : "";
            return `<div class="product ${isActive}" data-title="${name}">
                    <img src=${R2D.URL.DOMAIN + source.images.preview} data-id="${id}" alt="" /> 
                </div>`;
        })
        .join("");
    materialsListEl.innerHTML = "";
    materialsListEl.classList.add("products__list");
    materialsListEl.insertAdjacentHTML("beforeend", productsMarkup);
    dynamicContainerEl.append(materialsListEl);

    setMaterialsListener();

    slide({
        elHide: settingsContainerEl,
        elShow: materialsListEl,
        navTitle: prevName,
        side: "to-left",
        isBackBtn: true,
    });
}

function renderColorpicker(name, color) {
    colorpickerEl.value = color;

    colorpickerContEl.innerHTML = "";
    colorpickerContEl.append(colorpickerEl);
    dynamicContainerEl.append(colorpickerContEl);

    slide({
        elHide: settingsContainerEl,
        elShow: colorpickerContEl,
        navTitle: name,
        side: "to-left",
        isBackBtn: true,
    });
}
