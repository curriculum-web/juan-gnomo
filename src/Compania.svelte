<script>
  import { fly} from 'svelte/transition';
  import Comprar from './Comprar.svelte'
  import Back from './Back.svelte'

  let comprar = false
  const showComprar = () => {
    comprar = !comprar
  }

</script>

{#if comprar == false}

<div class="container" in:fly="{{x:-300, duration: 600}}">

<h1 ><span>Cuidado de</span> Tesoros</h1>

<div class="card">
<div class="card-content">
 <i class="far fa-gem"></i>

 <p>Custodia de Tesoros subterráneos. </p>
 <i class="fas fa-globe-americas" ></i>
 <p>Para cualquier lugar del mundo</p>
 
  <div class="btn" on:click={showComprar}>Comprar</div>
</div>

</div>
</div>
<Back on:click/>

{/if}

{#if comprar == true}
  <Comprar/>
  <Back on:click={showComprar}/>
{/if}

<style>

i {
  font-size: 90px;
  margin-top: 15px;
  margin-bottom: 10px;
}

.container {
    text-align: center;
    margin-top: 20px;
     font-weight: normal;
     color: #333;
    margin-bottom: 90px;
}
.container h1, h2 {
       font-family: "Satisfy", cursive;

}
.container h2 {
         font-family: "Satisfy", cursive;
         color: rgba(78, 158, 250, 0.795);

}

.container span {
  color: rgba(78, 158, 250, 0.795);

}

.card {
      width: 270px;
      margin: 10px auto;
     font-family: "Comfortaa", cursive;
     background:  rgba(78, 158, 250, 0.192);


  }
  .card p {
    padding: 10px;
    margin-bottom: 20px;
    margin-top: 10px;
  }

  .btn {
    background:rgba(78, 158, 250, 0.733);
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    border: 2px solid rgb(78, 158, 250);
    border-radius: 5px;
    font-weight: bold;
  }

   /* ################### TABLETS ############################### */

  @media (min-width: 500px) {
    
     .container {
		  margin-top: 50px;
	  }


    .card {
      width: 450px;
    }

    .container h1 {
      font-size: 50px;
    }
  }
 
     
</style>