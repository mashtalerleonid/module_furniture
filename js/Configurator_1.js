class Configurator_1 {
    constructor(plannerContainer, R2D) {
        this.initializeProperties();
        this.setupListeners(R2D);
        this.PH = new PlannerHelper(plannerContainer, R2D, this);
        this.customizePlanner();
        EventDispatcher.call(this);
    }

    initializeProperties() {
        this.configId = "advancedfurniture";
        this.configType = "";
        this.modelData = null;
        this.meshesData = {};
        this.configData = null;
        this.configInfo = null;
        this.idsForLoad = [];
        this.model3d = null;
        this.meshesContainer = new THREE.Object3D();
        this.meshesArr = [];
        this.isFewMeshesSelected = false;
        this.removedMeshes = [];
        this.newMeshHash = "";
        this.newMeshId = "";
        this.newModelId = "";
        this.isPlanner = false;
        this.queue = {};
        this.sceneObject = null;
        this.initMaterials = [];
        this.objectViewer3D = null;
        this.protector = 0;
        this.mapTagToProductIds = {};
    }

    setupListeners(R2D) {
        this.productsDataLoader = new R2D.ProductsDataLoader();
        this.init3DLoadedListener = this.onInit3DLoaded.bind(this);
        this.forReplace3DLoadedListener = this.forReplace3DLoaded.bind(this);
    }

    customizePlanner() {
        this.PH.disableCameraMoving();
        this.PH.blockSelectAndDrag();
        this.PH.removeTerrainTexture();
    }

    async loadProductData(id) {
        const url = `${R2D.URL.DOMAIN}${R2D.URL.URL_CATALOG_SEARCH}&ids=${id}`;
        const headers = {
            "Content-type": "application/x-www-form-urlencoded",
        };
        const response = await fetch(url, {
            method: "GET",
            credentials: "include",
            mode: "cors",
            headers,
        });
        const loadedData = await response.json();
        return loadedData.data.items[0];
    }

    async getMatDataForMarkup() {
        const matData = [];
        const materialsData = this.sceneObject.isParametric
            ? this.sceneObject.getMaterials(true)
            : this.getMaterialsForRightPanel();

        for (let i = 0; i < materialsData.length; i++) {
            const data = materialsData[i];

            if (data.source === "none") continue;

            let productData = null;

            if (data.addMaterial) {
                productData = R2D.Pool.getProductData(data.addMaterial);
                if (!productData) {
                    productData = await this.loadProductData(data.addMaterial);
                }

                const canvas = await R2D.Tool.getMatPrevFromMatIdAndColor(
                    data.addMaterial,
                    data.current
                );
                matData.push({
                    prevSrc: canvas.toDataURL(),
                    id: data.addMaterial,
                    color: data.current,
                    source: data.source,
                    index: i,
                    setId: "0",
                    hash: data.hash,
                    isColorpicker: "1",
                    name: productData.name,
                });
            } else {
                productData = R2D.Pool.getProductData(data.current);
                if (!productData) {
                    productData = await this.loadProductData(data.current);
                }

                const categoryId = Object.keys(productData.categoryMaterial)[0];
                const treeArr = [...productData.categoryMaterial[categoryId]].reverse();
                let curNodes = treeMaterial;
                for (let i = 0; i < treeArr.length - 1; i += 1) {
                    const curLevelId = treeArr[i].id;
                    curNodes = curNodes.find((el) => el.id === curLevelId).nodes;
                }
                if (treeArr.length > 0) {
                    curNodes = curNodes.find((el) => el.id === treeArr[treeArr.length - 1].id);
                }
                const partSrc = productData.source.images.preview;
                matData.push({
                    prevSrc: R2D.URL.DOMAIN + partSrc,
                    id: data.current,
                    source: data.source,
                    index: i,
                    setId: data.setId || "0",
                    hash: data.hash,
                    isColorpicker: "0",
                    urlList: curNodes.urlList || "",
                    name: curNodes.name || "",
                });
            }
        }

        return matData;
    }

    getPrevSrc(id) {
        if (id === "0") return hideImg.src;

        const productData = R2D.Pool.getProductData(id);
        if (!productData) return null;

        return `${R2D.URL.DOMAIN}${productData.source.images.preview}`;
    }

    getModelName(id) {
        const productData = R2D.Pool.getProductData(id);
        if (!productData) return null;

        return productData.name;
    }

    start(modelId, configInfo) {
        this.startModelId = modelId;
        const idToPlace =
            configInfo?.configType === "modelReplace" ? configInfo.modelData.curId : modelId;

        const settings = {
            x: 0,
            y: 0,
            z: 0,
        };

        this.PH.placeModel(idToPlace, settings, () => {
            this.initializeSceneObject(configInfo);
            this.PH.updateCameraSettings(this.sceneObject);
            this.startConfigurate(this.startModelId);
        });
    }

    initializeSceneObject(configInfo) {
        if (this.isPlanner) {
            this.sceneObject.width = configInfo.params.width;
            this.sceneObject.height = configInfo.params.height;
            this.sceneObject.depth = configInfo.params.depth;
            this.sceneObject.elevation = configInfo.params.elevation || 0;
        }

        curParams = {
            width: this.sceneObject.width,
            height: this.sceneObject.height,
            depth: this.sceneObject.depth,
            elevation:
                this.sceneObject.elevation || this.sceneObject.objectData.property.position.y,
        };

        this.configInfo =
            configInfo && Object.keys(configInfo).some((key) => key !== "params")
                ? configInfo
                : null;
        if (this.configInfo) this.sceneObject.configInfo = configInfo;
    }

    findConfigType() {
        return this.configData.geometries?.length > 0 || this.sceneObject.isParametric
            ? "meshReplace"
            : "modelReplace";
    }

    updateDimLimits() {
        const dimSettings = this.configData.model.dimensions;
        if (!dimSettings) return;

        dims.forEach((dim) => {
            if (dimSettings[dim]) {
                dimLimits[dim] = dimSettings[dim];
            } else {
                dimsToDisable.push(dim);
            }
        });

        if (dimsToDisable.length === 0) return;

        dimsToDisable.forEach((dim) => {
            dimContainers[dim].classList.add("dimDisabled");
        });
        wrapSVG.classList.add("lockDisabled");
    }

    async createMapTagToId() {
        const tagsArr = [];
        this.configData.model.modelsForReplace.forEach((model) => {
            if (model.tag != "0" && !tagsArr.includes(model.tag)) {
                tagsArr.push(model.tag);
            }
        });
        this.configData.geometries.forEach((data) => {
            if (data.modelsForReplace) {
                data.modelsForReplace.forEach((model) => {
                    if (model.tag != "0" && !tagsArr.includes(model.tag)) {
                        tagsArr.push(model.tag);
                    }
                });
                if (!tagsArr.includes(data.defaultTag)) {
                    tagsArr.push(data.defaultTag);
                }
            }
        });
        this.mapTagToProductIds = await R2D.Pool.loadProductDataByTagsArr(tagsArr);
    }

    addProductIds() {
        this.configData.model.modelsForReplace.forEach((model) => {
            model.id = this.mapTagToProductIds[model.tag][0];
        });

        this.configData.geometries.forEach((data) => {
            if (data.modelsForReplace) {
                data.defaultId = this.mapTagToProductIds[data.defaultTag][0];
                data.modelsForReplace.forEach((model) => {
                    model.id = model.tag == "0" ? "0" : this.mapTagToProductIds[model.tag][0];
                });
            }
        });
    }

    async startConfigurate(modelId) {
        this.configData = await this.getConfigData(modelId);
        if (!this.configData) {
            console.error("No config data!");
            return;
        }

        this.updateDimLimits();

        await this.createMapTagToId();

        this.addProductIds();

        this.initMaterials = this.sceneObject.getMaterialsObjects().map((mo) => ({ ...mo }));
        this.configType = this.findConfigType();

        if (this.configType === "meshReplace") {
            // заміна мешей
            const allCopyIndexes = this.configData.geometries.flatMap(
                (data) => data.copyIndexes || []
            );

            this.initMaterials.forEach((matData, index) => {
                let data = null;
                const hash = matData.hash;
                const dataFromConfig = this.configData.geometries.find(
                    (data) => data.geometryIndex === index
                );
                const copyIndexes = dataFromConfig?.copyIndexes;

                if (dataFromConfig) {
                    data = dataFromConfig;

                    this.meshesData[hash] = { ...data };
                    this.meshesData[hash].curId =
                        this.configInfo?.meshesData[hash]?.curId || this.meshesData[hash].defaultId;
                    if (this.meshesData[hash].modelsForReplace.some((data) => data.id == 0)) {
                        this.meshesData[hash].exists = true;
                    }
                    this.meshesData[hash].childrenPos = [];
                    this.queue[this.meshesData[hash].curId] = true;

                    // ----- check copy indexes -----
                    if (copyIndexes) {
                        this.meshesData[hash].copyIndexes = copyIndexes;
                        this.meshesData[hash].copiesHashes = copyIndexes.map(
                            (index) => this.initMaterials[index].hash
                        );
                        copyIndexes.forEach((index) => {
                            const hashCopy = this.initMaterials[index].hash;
                            this.meshesData[hashCopy] = {
                                geometryIndex: index,
                                curId:
                                    this.configInfo?.meshesData[hash]?.curId ||
                                    this.meshesData[hash].defaultId,
                                defaultId: this.meshesData[hash].defaultId,
                                childrenPos: [],
                            };
                        });
                    }
                    // -----
                } else if (!allCopyIndexes.includes(index)) {
                    //немає інфи в конфігурації і не для копіювання, тобто не буде проходити через replaceMesh
                    this.meshesData[hash] = {
                        curId: -1,
                        childrenPos: [],
                        geometryIndex: index,
                    };

                    const mesh = this.getMeshByHash(hash);
                    const keys = Object.keys(mesh.userData);
                    const hasPos = keys.some((key) => key.startsWith("childPos"));

                    if (hasPos) {
                        this.meshesData[hash].childrenPos = [];

                        for (const key in mesh.userData) {
                            if (key.startsWith("childPos")) {
                                const indexFromKey = key.split("_")[1];
                                const data = {
                                    childHash: this.initMaterials[indexFromKey].hash,
                                    childPos: mesh.userData[key],
                                };
                                this.meshesData[hash].childrenPos.push(data);
                            }
                        }
                    }
                }

                const alignmentFromConfig = this.configData.alignment?.[index];
                if (alignmentFromConfig) {
                    this.meshesData[hash].alignment = alignmentFromConfig;
                }
            });

            this.idsForLoad = Object.values(this.meshesData)
                .map((meshData) => meshData.curId)
                .filter((id) => id != 0 && id != -1);

            this.idsForLoad = [...new Set(this.idsForLoad)];

            if (!this.idsForLoad.length) {
                this.sceneObject.update();
                if (this.sceneObject.isParametric) {
                    this.PH.configurateParametric();
                }
            }
        } else if (this.configType === "modelReplace") {
            // заміна моделей
            this.modelData = this.configData.model;
            this.modelData.defaultId = modelId;
            if (this.configInfo) {
                this.modelData.curId = this.configInfo.modelData.curId;
                this.sceneObject.setMaterialsObjects(this.configInfo.materials);
            } else {
                this.modelData.curId = modelId;
            }

            this.sceneObject.update();
        }

        if (this.idsForLoad.length) {
            R2D.Pool3D.addEventListener(Event.FINISH, this.init3DLoadedListener);
            this.idsForLoad.forEach((id) => {
                R2D.Pool.getProductData(id).isGLTF = true;
                R2D.Pool3D.load(id);
            });
        } else {
            this.dispatchEvent(new Event("renderSettingsContainer"));
        }
    }

    async getConfigData(modelId) {
        // const objectData =
        //     R2D.Pool.getProductData(modelId) || (await this.loadProductData(modelId));
        // const metaZipSrc = `${R2D.URL.DOMAIN}${objectData.source.body.metaZip}`;
        // const response = await fetch(metaZipSrc);
        // const data = await response.blob();
        // const zip = await JSZip.loadAsync(data);
        // const json = await zip.files["main.json"].async("string");
        // let obj = null;
        // try {
        //     obj = JSON.parse(json);
        // } catch (error) {
        //     console.log(error);
        // }
        // return obj;

        const objectData =
            R2D.Pool.getProductData(modelId) || (await this.loadProductData(modelId));

        const metadata =
            objectData.metadata[this.configId]?.data || objectData.metadata.commonapp?.data;

        return metadata;
    }

    async onInit3DLoaded(e) {
        if (
            !Object.values(this.meshesData)
                .map((data) => data.curId)
                .includes(e.data)
        ) {
            return;
        }

        delete this.queue[e.data];

        if (Object.keys(this.queue).length) return;

        R2D.Pool3D.removeEventListener(Event.FINISH, this.init3DLoadedListener);

        this.findOwnPosNoChildren();

        await this.findTransformMatricesAndAlignPoints();

        if (this.configInfo) {
            this.applyConfigInfo();
        } else {
            this.replaceAllMeshes();
        }

        this.findOwnPosWithChildren();

        this.findParents();

        this.sceneObject.update();

        this.updateAllMeshes();

        this.dispatchEvent(new Event("renderSettingsContainer"));
    }

    applyConfigInfo() {
        const hashesFromConfigInfo = Object.keys(this.configInfo.meshesData);
        for (const hash in this.meshesData) {
            if (hashesFromConfigInfo.includes(hash)) {
                this.replaceMesh(this.meshesData[hash].curId, hash);
            } else {
                this.removeMeshFromModel(hash);
            }
        }
        this.sceneObject.setMaterialsObjects(this.configInfo.materials);
    }

    replaceAllMeshes() {
        for (const hash in this.meshesData) {
            this.replaceMesh(this.meshesData[hash].curId, hash);
        }
    }

    startReplaceMesh(id, hash) {
        this.newMeshId = id;
        this.newMeshHash = hash;

        this.productsDataLoader.loadOne(id, () => {
            R2D.Pool.getProductData(id).isGLTF = true;

            if (R2D.Pool3D.isLoaded(id)) {
                this.forReplace3DLoadedListener();
            } else {
                R2D.Pool3D.addEventListener(Event.FINISH, this.forReplace3DLoadedListener);
                R2D.Pool3D.load(id);
            }
        });
    }

    forReplace3DLoaded(e) {
        R2D.Pool3D.removeEventListener(Event.FINISH, this.forReplace3DLoadedListener);
        this.replaceMesh(this.newMeshId, this.newMeshHash);

        // ----- check copy indexes -----
        const configData = this.getConfigDataByHash(this.newMeshHash);
        if (configData?.copyIndexes) {
            configData.copyIndexes.forEach((copyIndex) => {
                this.replaceMesh(this.newMeshId, this.initMaterials[copyIndex].hash);
            });
        }
        // -----

        this.updateAllMeshes();
    }

    replaceMesh(newMeshId, meshHash) {
        if (newMeshId == -1) return;

        let mesh = null;
        let curMeshData = null;
        let curMesh = null;

        curMeshData = this.meshesData[meshHash];
        curMesh = this.getMeshByHash(meshHash);

        R2D.Pool3D.getData(newMeshId).scene.traverse(function (obj) {
            if (obj.type == "Mesh") {
                mesh = obj.clone();
                mesh.geometry = obj.geometry.clone();
            }
        });

        if (curMesh) {
            this.model3d.remove(curMesh);
        } else {
            // додавання схованого меша
            const deletedData = this.removedMeshes.find((data) => data.hash === meshHash);
            curMesh = deletedData.mesh;
            const oldIndex = deletedData.oldIndex;
            const sceneObjectMaterials = this.sceneObject.getMaterialsObjects();
            sceneObjectMaterials.splice(oldIndex, 0, deletedData.scObjMatDeletedData);
            this.removedMeshes = this.removedMeshes.filter((data) => data.hash !== meshHash);
            curMeshData.exists = true;

            this.dispatchEvent(new Event("updateCurMaterialsMarkup"));
        }

        curMeshData.curId = newMeshId;
        mesh.material = curMesh.material;
        mesh.userData.md5 = meshHash;

        const keys = Object.keys(mesh.userData);
        const hasPos = keys.some((key) => key.startsWith("childPos"));

        if (hasPos) {
            curMeshData.childrenPos = [];

            for (const key in mesh.userData) {
                if (key.startsWith("childPos")) {
                    const indexFromKey = key.split("_")[1];
                    const data = {
                        childHash: this.initMaterials[indexFromKey].hash,
                        childPos: mesh.userData[key],
                    };
                    curMeshData.childrenPos.push(data);
                }
            }
        }
        this.model3d.add(mesh);

        if (curMeshData.childrenPos?.length) this.findOwnPos(meshHash, curMeshData);

        this.sceneObject.configInfo = this.createConfigInfo();

        this.findParents();
    }

    replaceModel(newModelId) {
        this.dispatchEvent(new Event("clearCurMaterialsMarkup"));
        R2D.scene.remove(this.sceneObject);
        this.modelData.curId = newModelId;

        const settings = {
            x: 0,
            y: 0,
            z: 0,
        };

        this.PH.placeModel(newModelId, settings, () => {
            this.sceneObject.update();

            this.dispatchEvent(new Event("updateCurMaterialsMarkup"));
        });
    }

    getMeshByHash(hash) {
        return this.model3d.children.find((child) => child.userData.md5 === hash);
    }

    updateAllMeshes() {
        this.protector = 0;

        if (this.sceneObject.isParametric) {
            this.PH.clearParametricScaler();
        }

        this.model3d.children.forEach((mesh) => {
            mesh.position.set(0, 0, 0);
        });

        Object.entries(this.meshesData).forEach(([hash, meshData]) => {
            if (!meshData.childrenPos) return;

            if (meshData.hasOwnProperty("exists") && !meshData.exists) return;

            if (meshData.parentHash && meshData.curId == -1) {
                // меш має parent, не замінюється
                this.setGeometryToOrigin(this.getMeshByHash(hash).geometry);
            }

            if (!meshData.parentHash && meshData.childrenPos.length == 0 && meshData.curId != -1) {
                // меш не має parent i children, замінюється
                const mesh = this.getMeshByHash(hash);
                if (!mesh) return;

                this.setInitGeometryToMesh(mesh, meshData.curId);
                this.setGeometryToOrigin(mesh.geometry);
                if (meshData.transformMatrix) {
                    mesh.geometry.applyMatrix4(meshData.transformMatrix);
                    const initAlignPoint = this.findAlignPoint(mesh.geometry, meshData.alignment);
                    meshData.ownPos = meshData.alignPoint.clone().sub(initAlignPoint);
                }

                mesh.geometry.translate(meshData.ownPos.x, meshData.ownPos.y, meshData.ownPos.z);
                mesh.geometry.needsUpdate = true;
            }

            meshData.childrenPos.forEach((data) => {
                const child = this.getMeshByHash(data.childHash);
                if (!child) return;

                child.position.set(
                    data.childPos[0] * child.scale.x,
                    data.childPos[2] * child.scale.y,
                    -data.childPos[1] * child.scale.z
                );

                this.updatePosDependChildren(data.childHash, child);
            });
        });

        if (this.sceneObject.isParametric) {
            this.PH.configurateParametric();
        }

        this.PH.render();
    }

    updatePosDependChildren(parentHash, parent) {
        let curChildPos = this.meshesData[parentHash].childrenPos;

        if (!curChildPos) return;

        while (curChildPos.length > 0 && this.protector < 100) {
            this.protector += 1;

            curChildPos.forEach((data) => {
                const child = this.getMeshByHash(data.childHash);

                if (child) {
                    child.position.x += parent.position.x;
                    child.position.y += parent.position.y;
                    child.position.z += parent.position.z;
                }
            });

            curChildPos = this.meshesData[curChildPos[0].childHash].childrenPos;
        }
    }

    hideMesh(hash) {
        this.dispatchEvent(new Event("clearCurMaterialsMarkup"));

        this.removeMeshFromModel(hash);
        this.updateAllMeshes();
        this.PH.render();

        this.dispatchEvent(new Event("updateCurMaterialsMarkup"));
    }

    removeMeshFromModel(hash) {
        const mesh = this.getMeshByHash(hash);
        if (!mesh) return;

        const sceneObjectMaterials = this.sceneObject.getMaterialsObjects();
        const oldIndex = sceneObjectMaterials.findIndex((mo) => mo.hash === hash);
        const scObjMatDeletedData = sceneObjectMaterials.splice(oldIndex, 1)[0];

        this.removedMeshes.push({ hash, mesh, scObjMatDeletedData, oldIndex });
        this.model3d.remove(mesh);
        this.meshesData[hash].exists = false;
        this.meshesData[hash].curId = 0;

        // ----- check copy indexes -----
        const configData = this.getConfigDataByHash(hash);

        if (configData?.copyIndexes) {
            configData.copyIndexes.forEach((copyIndex) => {
                const hashCopy = this.initMaterials[copyIndex].hash;
                const mesh = this.getMeshByHash(hashCopy);

                const oldIndex1 = sceneObjectMaterials.findIndex((mo) => mo.hash === hashCopy);
                const scObjMatDeletedData = sceneObjectMaterials.splice(oldIndex1, 1)[0];
                this.removedMeshes.push({
                    hash: hashCopy,
                    mesh,
                    scObjMatDeletedData,
                    oldIndex: oldIndex1,
                });
                this.model3d.remove(mesh);
                this.meshesData[hashCopy].exists = false;
                this.meshesData[hashCopy].curId = 0;
            });
        }
        // -----
    }

    setMaterialAt(hash, materialId, type) {
        if (this.sceneObject.isParametric) {
            const materials = R2D.Tool.ps.getMaterialsForRightPanel(this.sceneObject);
            const index = materials.findIndex((mo) => mo.hash === hash);

            this.sceneObject.setMaterialAt(index, materialId);
        } else {
            const materials = this.sceneObject.getMaterialsObjects();
            const material = materials.find((mo) => mo.hash === hash);
            if (material) material[type] = materialId;

            // ----- check copy indexes -----
            const configData = this.getConfigDataByHash(hash);
            if (configData?.copyIndexes) {
                configData.copyIndexes.forEach((copyIndex) => {
                    const hashCopy = this.initMaterials[copyIndex].hash;
                    const copyMaterial = materials.find((mo) => mo.hash === hashCopy);
                    if (copyMaterial) copyMaterial[type] = materialId;
                });
            }
            // -----
        }

        this.sceneObject.update();
    }

    getMaterialsForRightPanel() {
        const materialsFromSceneObject = this.sceneObject.getMaterials();

        const allCopyIndexes = this.configData.geometries.flatMap((data) => data.copyIndexes || []);
        const allCopyHashes = allCopyIndexes.map((index) => this.initMaterials[index].hash);

        const materials = [];

        materialsFromSceneObject.forEach((material) => {
            if (!allCopyHashes.includes(material.hash)) {
                materials.push(material);
            }
        });

        return materials;
    }

    setColor(hash, color) {
        const materials = this.sceneObject.getMaterialsObjects();
        const material = materials.find((mo) => mo.hash === hash);
        if (material) material.current = color;

        // ----- check copy indexes -----
        const configData = this.getConfigDataByHash(hash);
        if (configData?.copyIndexes) {
            configData.copyIndexes.forEach((copyIndex) => {
                const hashCopy = this.initMaterials[copyIndex].hash;
                const copyMaterial = materials.find((mo) => mo.hash === hashCopy);
                if (copyMaterial) copyMaterial.current = color;
            });
        }
        // -----

        this.sceneObject.update();
    }

    setMeshActive(hash) {
        if (R2D.mouseInteractionHelper.setActiveMesh) {
            const currentMesh = this.objectViewer3D.getMeshByHash(hash);
            if (!currentMesh) return;

            const configData = this.getConfigDataByHash(hash);

            if (configData?.copyIndexes) {
                if (R2D.scene.currentMesh) R2D.mouseInteractionHelper.unsetActiveMesh();

                this.isFewMeshesSelected = true;
                const hashesArr = configData.copyIndexes.map(
                    (index) => this.initMaterials[index].hash
                );
                hashesArr.push(hash);
                this.meshesArr = hashesArr.map((hash) => this.objectViewer3D.getMeshByHash(hash));
                this.objectViewer3D.object3d.add(this.meshesContainer);
                this.meshesArr.forEach((mesh) => this.meshesContainer.add(mesh));

                R2D.scene.currentMeshParent = this.objectViewer3D.object3d;
                R2D.scene.currentMesh = this.meshesContainer;
            } else {
                R2D.mouseInteractionHelper.setActiveMesh(currentMesh);
            }
            this.PH.render();
        }
    }

    unsetMeshActive() {
        if (R2D.mouseInteractionHelper.unsetActiveMesh) {
            if (this.isFewMeshesSelected) {
                this.isFewMeshesSelected = false;
                this.meshesArr.forEach((mesh) => {
                    this.meshesContainer.remove(mesh);
                    this.objectViewer3D.object3d.add(mesh);
                });
                this.objectViewer3D.object3d.remove(this.meshesContainer);
                this.meshesArr = [];

                R2D.scene.currentMeshParent = null;
                R2D.scene.currentMesh = null;
            } else {
                R2D.mouseInteractionHelper.unsetActiveMesh();
            }

            this.PH.render();
        }
    }

    setGeometryToOrigin(geometry) {
        if (!geometry.boundingBox) {
            geometry.computeBoundingBox();
        }

        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);

        geometry.translate(-center.x, -center.y, -center.z);
        geometry.needsUpdate = true;
    }

    getConfigDataByHash(hash) {
        const index = this.initMaterials.findIndex((mo) => mo.hash === hash);
        return this.configData.geometries.find((data) => data.geometryIndex === index);
    }

    findParents() {
        Object.entries(this.meshesData).forEach(([hash, meshData]) => {
            delete meshData.parentHash;
        });

        Object.entries(this.meshesData).forEach(([hash, meshData]) => {
            if (!meshData.childrenPos) return;

            meshData.childrenPos.forEach((data) => {
                const childHash = data.childHash;
                this.meshesData[childHash].parentHash = hash;
            });
        });
    }

    findOwnPos(hash, meshData) {
        const geometry = this.getMeshByHash(hash)?.geometry;

        if (geometry) {
            if (!geometry.boundingBox) {
                geometry.computeBoundingBox();
            }

            meshData.ownPos = new THREE.Vector3();
            geometry.boundingBox.getCenter(meshData.ownPos);
        }
    }

    findOwnPosNoChildren() {
        Object.entries(this.meshesData).forEach(([hash, meshData]) => {
            if (!meshData.childrenPos.length) {
                this.findOwnPos(hash, meshData);
            }
        });
    }

    findOwnPosWithChildren() {
        Object.entries(this.meshesData).forEach(([hash, meshData]) => {
            if (meshData.childrenPos.length) {
                this.findOwnPos(hash, meshData);
            }
        });
    }

    copyModelToGlobalClipboard() {
        console.log("copyModelToGlobalClipboard");

        this.sceneObject.configInfo = this.createConfigInfo();
        const dataModel = R2D.Scene.makeSceneObjectData(this.sceneObject);
        dataModel.y = 0;

        window.parent.postMessage(
            JSON.stringify({
                action: "copy_to_clipboard",
                model: dataModel,
            }),
            "*"
        );

        Notiflix.Notify.success("Model copied", {
            timeout: 1500,
            width: "200px",
            cssAnimationDuration: 300,
            cssAnimationStyle: "from-right",
            fontSize: "16px",
            success: { background: "#66acf4", textColor: "#fff", notiflixIconColor: "#fff" },
        });
    }

    insertToPlanner() {
        window.parent.postMessage(
            JSON.stringify({
                action: "insert_to_planner",
                configInfo: this.createConfigInfo(),
            }),
            "*"
        );

        this.PH.disposeRenderers();
    }

    close() {
        window.parent.postMessage(
            JSON.stringify({
                action: "close",
            }),
            "*"
        );

        this.PH.disposeRenderers();
    }

    createConfigInfo() {
        const configInfo = {
            configId: this.configId,
            startModelId: this.startModelId,
            materials: this.sceneObject.getMaterialsObjects(),
            configType: this.configType,
        };

        if (this.configType === "modelReplace") {
            configInfo.modelData = {
                curId: this.modelData.curId,
            };
        }
        if (this.configType === "meshReplace") {
            configInfo.meshesData = {};

            this.model3d.traverse((mesh) => {
                if (mesh.type === "Mesh") {
                    const hash = mesh.userData.md5;

                    const {
                        curId,
                        modelsForReplace,
                        copiesHashes,
                        ownPos,
                        transformMatrix,
                        parentHash,
                        childrenPos,
                    } = this.meshesData[hash];

                    configInfo.meshesData[hash] = {
                        curId,
                        meshPos: mesh.position,
                    };

                    if (!modelsForReplace) {
                        configInfo.meshesData[hash].possibleIds = [];
                    } else if (modelsForReplace.length == 0) {
                        configInfo.meshesData[hash].possibleIds = [curId];
                    } else {
                        configInfo.meshesData[hash].possibleIds = modelsForReplace
                            .map((data) => data.id)
                            .filter((id) => id != 0);
                    }

                    if (copiesHashes) {
                        configInfo.meshesData[hash].copiesHashes = copiesHashes;
                    }

                    if (!parentHash) {
                        configInfo.meshesData[hash].geomPos = { ...ownPos };
                        if (!childrenPos.length) {
                            configInfo.meshesData[hash].transformMatrix = transformMatrix;
                        }
                    }
                }
            });

            configInfo.params = {
                width: this.sceneObject.width,
                height: this.sceneObject.height,
                depth: this.sceneObject.depth,
                elevation:
                    this.sceneObject.elevation || this.sceneObject.objectData.property.position.y,
            };
        }

        return configInfo;
    }

    updateModel(params) {
        this.sceneObject.setWidth(params.width);
        this.sceneObject.setHeight(params.height);
        this.sceneObject.setDepth(params.depth);
        // this.sceneObject.y = -params.height / 2;
        this.sceneObject.elevation = params.elevation;
        this.sceneObject.update();
    }

    getURLforAR(size) {
        const configInfo = this.createConfigInfo();

        const hashessArr =
            configInfo.configType === "meshReplace"
                ? this.initMaterials.map((mo) => mo.hash)
                : this.sceneObject.getMaterialsObjects().map((mo) => mo.hash);

        const shortConfigInfo = R2D.AR.convertToShort(configInfo, hashessArr);
        const confInfo64 = btoa(JSON.stringify(shortConfigInfo));

        const baseUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size.w}x${size.h}&data=`;
        // const url = `${baseUrl}https://ar.realist.digital/?config=${confInfo64}`;
        const url = `${baseUrl}https://configurator.realist.digital/?config=${confInfo64}`;

        window.parent.postMessage(
            JSON.stringify({
                action: "url_for_AR",
                url,
            }),
            "*"
        );

        return url;
    }

    async findTransformMatricesAndAlignPoints() {
        for (const [hash, meshData] of Object.entries(this.meshesData)) {
            if (meshData.curId == -1) continue;

            const initGeom = await this.getInitGeometry(meshData.defaultId);
            if (!initGeom) continue;

            const finalGeom = this.getMeshByHash(hash)?.geometry;
            if (!finalGeom) continue;

            const transformMatrix = this.findTransformMatrix(initGeom, finalGeom);
            const alignPoint = this.findAlignPoint(finalGeom, meshData.alignment);
            if (transformMatrix) {
                meshData.transformMatrix = transformMatrix;
                meshData.alignPoint = alignPoint;
            }
        }
    }

    async getInitGeometry(productId) {
        let productData = R2D.Pool.getProductData(productId);
        if (!productData) {
            productData = await this.loadProductData(productId);
        }
        R2D.Pool.getProductData(productId).isGLTF = true;

        if (R2D.Pool3D.isLoaded(productId)) {
            return this.extractGeometry(productId);
        }

        return new Promise((resolve) => {
            const finishHandler = (e) => {
                if (e.data !== productId) return;

                R2D.Pool3D.removeEventListener(Event.FINISH, finishHandler);
                resolve(this.extractGeometry(productId));
            };

            R2D.Pool3D.addEventListener(Event.FINISH, finishHandler);
            R2D.Pool3D.load(productId);
        });
    }

    extractGeometry(productId) {
        let geometry = null;
        R2D.Pool3D.getData(productId).scene.traverse((obj) => {
            if (obj.type === "Mesh") {
                geometry = obj.geometry;
            }
        });
        return geometry;
    }

    setInitGeometryToMesh(mesh, id) {
        mesh.geometry = this.extractGeometry(id).clone();
    }

    findTransformMatrix(initGeom, finalGeom) {
        const nonIndexedInitGeom = initGeom.toNonIndexed();
        const nonIndexedFinalGeom = finalGeom.toNonIndexed();

        return this.findRotationBetweenGeometries(nonIndexedInitGeom, nonIndexedFinalGeom);
    }

    findRotationBetweenGeometries(initialGeometry, finalGeometry) {
        const posA = initialGeometry.attributes.position;
        const posB = finalGeometry.attributes.position;

        if (posA.count !== posB.count) {
            throw new Error("Geometries must have the same number of vertices");
        }

        // Compute centroids
        const centroidA = new THREE.Vector3();
        const centroidB = new THREE.Vector3();
        for (let i = 0; i < posA.count; i++) {
            centroidA.add(new THREE.Vector3().fromBufferAttribute(posA, i));
            centroidB.add(new THREE.Vector3().fromBufferAttribute(posB, i));
        }
        centroidA.divideScalar(posA.count);
        centroidB.divideScalar(posB.count);

        // Assemble corresponding points arrays (centered)
        const pointsA = [];
        const pointsB = [];
        for (let i = 0; i < posA.count; i++) {
            pointsA.push(new THREE.Vector3().fromBufferAttribute(posA, i).sub(centroidA));
            pointsB.push(new THREE.Vector3().fromBufferAttribute(posB, i).sub(centroidB));
        }

        // Kabsch algorithm
        // Compute covariance matrix H (zero-initialize!)
        let H = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0],
        ];
        for (let i = 0; i < pointsA.length; i++) {
            const a = pointsA[i];
            const b = pointsB[i];
            H[0][0] += a.x * b.x;
            H[0][1] += a.x * b.y;
            H[0][2] += a.x * b.z;
            H[1][0] += a.y * b.x;
            H[1][1] += a.y * b.y;
            H[1][2] += a.y * b.z;
            H[2][0] += a.z * b.x;
            H[2][1] += a.z * b.y;
            H[2][2] += a.z * b.z;
        }

        // SVD decomposition of H
        let U, S, V;
        if (typeof numeric !== "undefined" && numeric.svd) {
            const svd = numeric.svd(H);
            // U, S, V are arrays from numeric.js
            U = svd.U;
            V = svd.V;
            // Compute R = V * U^T
            // numeric.js provides transpose and dot
            let UT = numeric.transpose(U);
            let R = numeric.dot(V, UT);

            // If det(R) < 0, fix improper rotation (reflection)
            if (numeric.det(R) < 0) {
                V[2][0] *= -1;
                V[2][1] *= -1;
                V[2][2] *= -1;
                R = numeric.dot(V, UT);
            }

            // Convert R (3x3) to THREE.Matrix4
            const rotMat4 = new THREE.Matrix4().set(
                R[0][0],
                R[0][1],
                R[0][2],
                0,
                R[1][0],
                R[1][1],
                R[1][2],
                0,
                R[2][0],
                R[2][1],
                R[2][2],
                0,
                0,
                0,
                0,
                1
            );

            return rotMat4;
        } else {
            return null;
        }
    }

    findAlignPoint(geom, align) {
        if (!geom.boundingBox) {
            geom.computeBoundingBox();
        }
        const bbox = geom.boundingBox;
        const alignPoint = new THREE.Vector3();
        bbox.getCenter(alignPoint);

        if (!align) {
            return alignPoint;
        }

        if (align.x === "left") {
            alignPoint.x = bbox.min.x;
        } else if (align.x === "right") {
            alignPoint.x = bbox.max.x;
        } else if (align.x === "center") {
            // alignPoint.x is already the center
        }

        if (align.y === "top") {
            alignPoint.y = bbox.max.y;
        } else if (align.y === "bottom") {
            alignPoint.y = bbox.min.y;
        } else if (align.y === "center") {
            // alignPoint.y is already the center
        }

        if (align.z === "back") {
            alignPoint.z = bbox.min.z;
        } else if (align.z === "front") {
            alignPoint.z = bbox.max.z;
        } else if (align.z === "center") {
            // alignPoint.z is already the center
        }

        return alignPoint;
    }
}
