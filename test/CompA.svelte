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

<style>
    div{
        color: red;
        background-color: aliceblue;
    }
    .some-div{
        color: #7f7f7f
    }
</style>