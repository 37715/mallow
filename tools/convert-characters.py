"""
Convert the Minty character packs from FBX to one compressed GLB.

Run:  blender --background --python tools/convert-characters.py

Why this is a checked-in script and not a manual export: the packs are 25 MB of
FBX with 62 modular meshes and 63 clips, and they will be re-exported every time
we change what's included. A script makes that reproducible and reviewable; a
one-off GUI export does not.

**Two packs go in and one character comes out.** The base pack (Cozy Character
Pack v1.2) has the wardrobe and the whole café vocabulary — sitting, drinking,
serving. The Lip Sync and Expressions pack has the *face*: split left/right
eyes, a mouth, and twenty social clips including the wave the base pack
famously does not contain. They were authored against the same rig, which is
what makes this merge a merge rather than a retarget:

    45 of the talking pack's 47 joints exist in the base pack by name, and the
    two that don't (`held_item_notepad`, `held_item_pen`) are props for a clip
    we don't ship. Every bone channel therefore lands.

What it does, in order:
  1. Import Character_All.fbx — the wardrobe and the café clips.
  2. Import Character_Talking.fbx — take its face meshes and its clips, throw
     away its cut-down wardrobe (the base pack's is a superset).
  3. Swap the head: the base pack bakes the eyes into `Body_Head` as a second
     primitive, so it cannot blink. The talking pack's head is skin-only with
     `Body_Eye_L`, `Body_Eye_R` and `Body_Mouth` as separate meshes, which is
     what lets `entities/character-face.ts` drive them independently.
  4. Rehome those face meshes onto the base pack's armature and delete the
     talking pack's own.
  5. Export GLB with Draco mesh compression and quantised attributes.

Keeping *all* 18 hairstyles and 9 tops is the point of a modular pack — that is
where customer variety comes from — so the cull list is deliberately short.
"""

import bpy
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Read the FBX from the raw packs, never from `public/`. Everything under
# `public/` is copied verbatim into `dist/` and therefore into the .ipa, so a
# 17 MB source asset parked there ships to every player for nothing — which is
# exactly what this script exists to avoid. Only the GLB output belongs there.
SRC = os.path.join(
    REPO,
    "graphics/Minty.Kit-Characters-Asset Pack v1.2/Character/Character_All.fbx",
)
TALKING = os.path.join(
    REPO,
    "graphics/Characters - Lip Sync and Expressions v0.1/Character_Talking/fbx/Character_Talking.fbx",
)
OUT = os.path.join(REPO, "public/assets/characters/characters.glb")

# Meshes we will never show. `0Nude` variants are the pack's underwear layer,
# only useful if you render a character with no clothes on — we always pick a
# top and legs, so they are pure weight.
CULL_PREFIXES = ("Clothes_Top_0Nude", "Clothes_Legs_0Nude")

# What the talking pack is here for. Everything else it ships (two hairstyles,
# one t-shirt, one pair of trousers) is a strict subset of the base pack's
# wardrobe, so taking it would mean two meshes with the same name.
FACE_MESHES = ("Body_Head", "Body_Eye_L", "Body_Eye_R", "Body_Mouth")


def log(message):
    print(f"[convert] {message}", flush=True)


def fail(message):
    log(f"FAILED: {message}")
    sys.exit(1)


bpy.ops.wm.read_factory_settings(use_empty=True)

for path in (SRC, TALKING):
    if not os.path.exists(path):
        fail(f"source not found at {path}")

# ---------------------------------------------------------------- base pack

log(f"importing {os.path.basename(SRC)} ({os.path.getsize(SRC) / 1e6:.1f} MB)")
bpy.ops.import_scene.fbx(filepath=SRC, automatic_bone_orientation=True)

armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
if len(armatures) != 1:
    fail(f"expected one armature in the base pack, found {len(armatures)}")
rig = armatures[0]
base_actions = {a.name for a in bpy.data.actions}
log(
    f"imported {len([o for o in bpy.data.objects if o.type == 'MESH'])} meshes, "
    f"{len(rig.data.bones)} bones, {len(base_actions)} actions"
)

# ------------------------------------------------------------- talking pack

# Record what already exists so the second import can be told apart from the
# first by difference rather than by name — FBX import gives us no handle on
# "the things that just arrived".
before = set(bpy.data.objects)

log(f"importing {os.path.basename(TALKING)} ({os.path.getsize(TALKING) / 1e6:.1f} MB)")
bpy.ops.import_scene.fbx(filepath=TALKING, automatic_bone_orientation=True)

arrived = [o for o in bpy.data.objects if o not in before]
talking_rig = next((o for o in arrived if o.type == "ARMATURE"), None)
if talking_rig is None:
    fail("the talking pack brought no armature")

# **The FBX importer prefixes every action with its source armature's name**,
# so the talking pack's clips arrive as `Armature.001|Armature|Social_WaveHello`
# — the second armature in the file, keeping its own internal prefix. Left
# alone they export under that doubled name and nothing can find them, since
# `character-library.ts` strips exactly one `Armature|`. Normalise first, then
# look for collisions; doing it the other way round finds none.
adopted = [a for a in bpy.data.actions if a.name not in base_actions]
for action in adopted:
    action.name = "Armature|" + action.name.rsplit("|", 1)[-1]

# **Both packs ship `0TPose` and `Walk_Loop`.** The base pack's versions win:
# the café's clips were authored against them, `character-library.ts` names
# `Walk_Loop` bare, and two clips cannot share a name in the export. Blender
# has already suffixed the newcomer `.001` as a result of the rename above.
duplicates = [
    a.name
    for a in bpy.data.actions
    if a.name not in base_actions and a.name.rsplit(".", 1)[0] in base_actions
]
for name in duplicates:
    bpy.data.actions.remove(bpy.data.actions[name])
log(f"dropped {len(duplicates)} duplicate clips: {', '.join(duplicates) or 'none'}")

# The talking pack's clips are authored on its own rig. Bone names match, and a
# Blender action addresses bones by name (`pose.bones["..."]`), so re-pointing
# the animation data at the base rig is the whole of the "retarget".
kept_clips = sorted(a.name for a in bpy.data.actions if a.name not in base_actions)
log(f"adopted {len(kept_clips)} clips: {', '.join(c.split('|')[-1] for c in kept_clips)}")

# ------------------------------------------------------------- face meshes

# The base pack's head carries the eyes as a second primitive, so they cannot
# move independently of it. Out it goes, replaced by the talking pack's
# skin-only head plus three separately drivable face meshes.
if "Body_Head" in bpy.data.objects:
    old_head = next(
        o for o in bpy.data.objects if o.name == "Body_Head" and o not in arrived
    )
    # **Remove the mesh datablock, not just the object.** Deleting the object
    # leaves its mesh in `bpy.data.meshes` with zero object users but still
    # counted as a user of `M_Eyes` — so the material never becomes an orphan,
    # the name stays taken, and renaming the new eye material to `M_Eyes` gets
    # silently suffixed back to `M_Eyes.001`.
    old_mesh = old_head.data
    bpy.data.objects.remove(old_head, do_unlink=True)
    bpy.data.meshes.remove(old_mesh)
    log("removed the base pack's head (eyes baked in as a second primitive)")

kept_faces = []
for obj in arrived:
    if obj.type != "MESH":
        continue
    # Blender may have suffixed a name that collided with the base pack's.
    stem = obj.name.rsplit(".", 1)[0]
    if stem not in FACE_MESHES:
        bpy.data.objects.remove(obj, do_unlink=True)
        continue
    obj.name = stem
    # Rehome onto the base rig: the armature modifier decides what deforms the
    # mesh, and the vertex groups it reads are already named for the bones.
    for modifier in obj.modifiers:
        if modifier.type == "ARMATURE":
            modifier.object = rig
    obj.parent = rig
    kept_faces.append(obj.name)

missing = [name for name in FACE_MESHES if name not in kept_faces]
if missing:
    fail(f"the talking pack is missing face meshes: {', '.join(missing)}")
log(f"took face meshes: {', '.join(kept_faces)}")

# **The runtime switches on material *name*** — `character-library.ts` reads
# `M_Skin` to bind the skintone and `M_Hair` to bind the hair colour. Blender
# has just imported a second `M_Skin` and a second `M_Eyes` and suffixed them
# `.001`, which would leave the new head with no skintone and no way to say so:
# the fallback is a white face, and nothing throws.
#
# The head joins the base pack's own `M_Skin`, so a guest's face and hands are
# guaranteed the same material rather than two that merely start equal. The
# eyes take the name outright — the base pack's `M_Eyes` died with the old head.
skin = bpy.data.materials.get("M_Skin")
if skin is None:
    fail("the base pack has no M_Skin to put the new head on")
for name, wanted in (("Body_Head", "M_Skin"), ("Body_Eye_L", "M_Eyes"), ("Body_Eye_R", "M_Eyes")):
    obj = bpy.data.objects[name]
    for slot in obj.material_slots:
        if wanted == "M_Skin":
            slot.material = skin
        elif slot.material is not None and slot.material.name != wanted:
            orphan = bpy.data.materials.get(wanted)
            if orphan is not None and orphan.users == 0:
                bpy.data.materials.remove(orphan)
            slot.material.name = wanted
log("reconciled face materials onto M_Skin / M_Eyes / M_Mouth")

# The talking rig has served its purpose; its actions now live on the base rig.
bpy.data.objects.remove(talking_rig, do_unlink=True)

# ------------------------------------------------------------------- output

# Collect names *before* removing anything: `bpy.data.objects.remove` frees the
# struct, so holding Python references to the objects across the loop and then
# reading `.name` raises "StructRNA of type Object has been removed".
culled = [
    o.name for o in bpy.data.objects if o.type == "MESH" and o.name.startswith(CULL_PREFIXES)
]
for name in culled:
    bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
log(f"culled {len(culled)} unused meshes: {', '.join(culled) or 'none'}")

# Bake every action into the export. Without this only the active action ships,
# and the sitting/drinking clips are the whole reason to use this pack.
if rig.animation_data is None:
    rig.animation_data_create()

meshes = [o for o in bpy.data.objects if o.type == "MESH"]
log(f"exporting {len(meshes)} meshes and {len(bpy.data.actions)} clips (Draco + quantisation)…")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=12,
    export_draco_normal_quantization=8,
    export_draco_texcoord_quantization=10,
    export_skins=True,
    export_animations=True,
    export_animation_mode="ACTIONS",
    export_bake_animation=True,
    export_apply=False,
    export_yup=True,
)

size = os.path.getsize(OUT) / 1e6
log(f"wrote {os.path.basename(OUT)} — {size:.1f} MB")
