Open a cmd window (not powershell) in the project root directory and run these commands to create symlinks in the com.mojang folders.

```
mklink /j "%appdata%\Minecraft Bedrock\Users\Shared\games\com.mojang\development_resource_packs\mcbedrock-give-xtra" "%cd%\resource_pack"
```

```
mklink /j "%appdata%\Minecraft Bedrock\Users\Shared\games\com.mojang\development_behavior_packs\mcbedrock-give-xtra" "%cd%\behavior_pack"
```
