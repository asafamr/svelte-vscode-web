<script >
    import CompB, {moduleExport} from "./CompB.svelte";
    let myname = 'A'

</script> 
this is comp {myname}

it inlcudes
<div class="some-div">
    <CompB paramNum=200></CompB>
    
    an import: {moduleExport}
</div>