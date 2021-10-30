<script context="module">
    export const moduleExport  = 'exp';
</script>
<script lang="ts">
    let myname:string = 'B';
    import {} from "./tsmod"
    export let paramNum = 100;
</script>

this is comp {myname}
param {paramNum}