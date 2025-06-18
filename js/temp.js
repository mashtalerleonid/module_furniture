async function loadGLBFile(productId, src) {
    return new Promise((resolve, reject) => {
        // const loader = new THREE.GLTFLoader();
        this.GLTFLoader.load(src, (gltf) => {
            gltf.scene.traverse((obj) => {
                if (obj.isMesh) {
                }
            });

            R2D.Pool3D.__data[productId] = gltf;
            R2D.Pool3D.__loaded[productId] = true;

            resolve(gltf);
        });
    });
}

function getModel3dFromPool3d(productId) {
    const gltf = R2D.Pool3D.getData(productId);

    let children = null;
    let geometries = null;
    const model3d = new THREE.Object3D();

    if (gltf.scene?.children[0].type === "Mesh") {
        children = gltf.scene.clone().children;
        geometries = children?.map((el) => el.geometry.clone());
    } else {
        children = gltf.scene?.children[0].clone().children;
        geometries = children?.map((el) => el.geometry.clone());
    }

    children.forEach((child, index) => {
        child.geometry = geometries[index];
    });

    model3d.add(...children);

    // const geometriesHash = [];

    // model3d.traverse(function (obj) {
    //     if (obj.type == "Mesh") {
    //         if (obj.userData.md5) geometriesHash.push(obj.userData.md5);
    //     }
    // });
    return model3d;
}

async function placeGroupModel(id, settings, callback) {
    console.log("placeGroupModel", id, settings);

    const productData = await this.loadProductData(id);
    console.log("Product Data:", productData);

    const materials = productData.source.body.materials;
    this.groupMaterials.push(materials);

    let model3d = null;
    if (R2D.Pool3D.isLoaded(id)) {
        model3d = this.getModel3dFromPool3d(id);
    } else {
        const glbSrc = R2D.makeURL(R2D.URL.DOMAIN, productData.source.body.package);
        await this.loadGLBFile(id, glbSrc);
        model3d = this.getModel3dFromPool3d(id);
    }

    model3d.position.set(settings.x, settings.y, settings.z);

    this.PH.addToScene(model3d);

    if (callback) callback();

    return;

    R2D.scene.placeObject(id, settings).then((sceneObject) => {
        this.materialsOnModelMap = new Map();
        const materials = sceneObject.objectData.source.body.materials;

        materials.forEach((material) => {
            const id = material.addMaterial || material.default;
            if (id != 0) this.materialsOnModelMap.set(id, true);
        });

        this.configurator.objectViewer3D =
            R2D.commonSceneHelper.productHelper.findObjectView3dBySceneObject(sceneObject);
        this.configurator.sceneObject = sceneObject;
        this.configurator.model3d = this.configurator.objectViewer3D.object3d;

        if (R2D.Pool3D.isLoaded(id)) {
            onPool3DFinishListener.call(this);
        } else {
            R2D.Pool3D.addEventListener(Event.FINISH, onPool3DFinishListener);
        }
    });

    function onPool3DFinishListener(e) {
        const materialsOnModelIds = Array.from(this.materialsOnModelMap.keys());
        const isAllMaterialsLoaded = materialsOnModelIds.every((id) => R2D.Pool.isProductData(id));

        if (isAllMaterialsLoaded) {
            R2D.Pool3D.removeEventListener(Event.FINISH, onPool3DFinishListener);
            if (callback) callback();
        }
    }
    onPool3DFinishListener = onPool3DFinishListener.bind(this);
}

async function getInitGeometry(productId) {
    await this.getProductData(productId);

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

function extractGeometry(productId) {
    let geometry = null;
    R2D.Pool3D.getData(productId).scene.traverse((obj) => {
        if (obj.type === "Mesh") {
            geometry = obj.geometry;
        }
    });
    return geometry;
}
