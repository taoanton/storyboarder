const GPUPicker = require("./GPUPicker");
const SkeletonUtils = require("../IK/utils/SkeletonUtils");
class XRGPUPicker extends GPUPicker
{
    constructor()
    {
        super();
        this.addedGroupsId = [];
        this.allowedObjectsTypes = ["object", "character", "bonesHelper", "gui"];
    }

    initalizeChildren(intersectObjects)
    {
        super.initalizeChildren(intersectObjects);
        let objects = [];
        for(let i = 0, n = intersectObjects.length; i < n; i++)
        {
            let intesectable = intersectObjects[i];
            if(this.addedGroupsId.some(group => group === intesectable.uuid))
            {
                continue;
            }
            this.getAllSceneMeshes(intesectable, objects);
            this.addedGroupsId.push(intesectable.uuid);
        }

        for(let i = 0, n = objects.length; i < n; i++)
        {
            let object = objects[i];
            const id = i + this.idBonus;
            this.gpuPickerHelper.selectableObjects[id] = object;
            const pickingMaterial = new THREE.MeshPhongMaterial({
                emissive: new THREE.Color(id),
                color: new THREE.Color(0, 0, 0),
                specular: 0x0,
                skinning: true,
                shininess: 0,
                flatShading: false,
                morphNormals: true,
                morphTargets: true
              });
            let pickingCube = null;
            let node = new THREE.Object3D();

            if(object.type === "SkinnedMesh")
            {
                let parent = null;
                parent = object.parent.parent;
                let userData = parent.userData;
                parent.userData = [];
                node = SkeletonUtils.clone(parent);
                parent.userData = userData;
                // Removes load
                let lod = node.children[0];
                lod.levels.pop();
                lod.levels.pop();
                lod.levels.pop();
                lod.levels.pop();
                // removes load
                pickingCube = node.children[0].children[0];
                pickingCube.material = pickingMaterial;
                pickingCube.matrixWorldNeedsUpdate = true;
                pickingCube.updateMatrixWorld(true);
                node.type = "character";
                pickingCube.visible = true;
                pickingCube.name = "male-adult-0";

            }
            else if(object.userData && object.userData.type === "gui")
            {
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.type = "gui"
                node.add(pickingCube);
                if(object.name === "camera_button")
                {
                    object.updateMatrixWorld(true);
                }
            }
            else
            {  
                pickingCube = new THREE.Mesh(object.geometry, pickingMaterial);
                node.type = object.userData.type;
                node.add(pickingCube);
            }
            pickingCube.matrixAutoUpdate = false;
            node.matrixAutoUpdate = false;
            this.pickingScene.add(node);
            pickingCube.pickerId = id;
        } 
    }
  
    updateObject(hmdCam)
    {
        super.updateObject();
        for(let i = 0, n = this.pickingScene.children.length; i < n; i++)
        {
            let clonnedObject = null;
            let originalObject = null;
            clonnedObject = this.pickingScene.children[i];
            originalObject = clonnedObject.type === "character" ? this.gpuPickerHelper.selectableObjects[i + this.idBonus].parent : this.gpuPickerHelper.selectableObjects[i + this.idBonus];
            originalObject = clonnedObject.type === "gui" ? this.gpuPickerHelper.selectableObjects[i + this.idBonus].parent : originalObject;
            if(!originalObject)
            {
                continue;
            }
            if(clonnedObject.type === "gui")
            {
                clonnedObject.position.copy(originalObject.worldPosition());
                //clonnedObject.position.z = -clonnedObject.position.z;
                clonnedObject.position.x -= hmdCam.position.x;
                clonnedObject.position.z -= hmdCam.position.z;
                clonnedObject.quaternion.copy(originalObject.worldQuaternion());
                clonnedObject.scale.copy(originalObject.worldScale());
                clonnedObject.updateMatrixWorld(true);
            }
            else
            {
                clonnedObject.position.copy(originalObject.worldPosition());
                clonnedObject.quaternion.copy(originalObject.worldQuaternion());
                clonnedObject.scale.copy(originalObject.worldScale());
                clonnedObject.updateMatrixWorld(true);
            }
            if(clonnedObject.type === "character" && this.gpuPickerHelper.selectableObjects[i + this.idBonus].skeleton)
            {
                let clonnedSkinnedMesh = null;
                clonnedSkinnedMesh = clonnedObject.children[0].children.find(child => child.type === "SkinnedMesh");
                let originalSkinnedMesh = this.gpuPickerHelper.selectableObjects[i + this.idBonus];
            
                let originalRootBone = originalSkinnedMesh.skeleton.bones[0];
                let clonnedRootBone = clonnedSkinnedMesh.skeleton.bones[0];
           
                this.updateSkeletonBone(clonnedRootBone, originalRootBone);
                clonnedRootBone.updateMatrixWorld(true);
            }
        }
    }

    getAllSceneMeshes(sceneMesh, meshes)
    {
        super.getAllSceneMeshes();
        let sceneChildren = sceneMesh.children;
        if(sceneChildren === undefined)
        {
            return;
        }
        if(sceneMesh.userData && this.allowedObjectsTypes.some(allowObject => allowObject === sceneMesh.userData.type))
        {
            if(sceneMesh.userData.type === "gui")
            {
                sceneMesh.traverse(object =>
                    {
                        if(object.type === "Mesh" && !object.name.includes("_icon")) 
                        {
                            meshes.push(object); 
                            return;
                        }  
                    });
            }
            else
            {
                for(let i = 0, n = sceneChildren.length; i < n; i++)
                {
                    let child = sceneChildren[i];
                    if(child.type === "Mesh") 
                    {
                        meshes.push(child); 
                        return;
                    }  

                    if(child.children.length !== 0 && child.children[0].type === "BonesHelper")
                    {
                        this.addConesToArray(meshes, child.children[0].cones );
                        return;
                    }

                    if(child.children.length !== 0 && child.children[0].type === "LOD")
                    {
                        meshes.push(child.children[0].children[0]);
                    }
                }
            }
        }
        for(let i = 0, n = sceneChildren.length; i < n; i++)
        {
            this.getAllSceneMeshes(sceneChildren[i], meshes);
        }
    }
}
module.exports = XRGPUPicker;
