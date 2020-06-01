<script>
  import { fly, fade} from 'svelte/transition';
  import Back from './Back.svelte'

  import programacion from './storeProgramacion.js'

  let portfolio = false
  const showPortfolio = () => {
    portfolio = !portfolio
  }

</script>

<div class="container"  in:fly="{{x:-300, duration: 600}}">

<h1 >Protección de <span>Jardines</span></h1>

<div class="cardTres">
  <div class="card-content">
   <i class="fas fa-hat-wizard"></i>

      <p>Pongo toda mi magia al servicio de tu hogar</p>
      <div class="icons"><a href="https://github.com/EnzoDaneri" target="blank"><i class="fab fa-github"></i></a>
     <a href="https://wa.me/542392462524/?text=Hola!%20vi%20tu%20web%20"><i class="fab fa-whatsapp"></i></a>
     <a href="https://www.linkedin.com/in/enzo-adri%C3%A1n-daneri-desarrollo-web/"target="blank"><i class="fab fa-linkedin-in"></i></a></div>
      {#if portfolio == false}
            <div class="btn" on:click={showPortfolio}>Portfolio</div>
      {:else}  
             <div class="btn" on:click={showPortfolio}>Ocultar</div>
      {/if}
    
  </div>
</div>

{#if portfolio == true}

{#each programacion as project, index}
<div in:fade> 
<div class={index% 2 == 0 ? "card" : "cardDos"}>
<div class="card-content">
<a href={project.url}><div class="verLink">Ver</div>
</a>
</div>
<p>{project.title}</p>

</div>
</div>
{/each}
{/if}


</div>



  <style>
.container i {
  font-size: 60px;
  margin-top: 20px;
  margin-bottom: 5px;
}

  .container {
      text-align: center;
      margin-top: 30px;
    margin-bottom: 90px;
  }

.container h1 {
 font-family: "Satisfy", cursive;
 font-weight: normal;

}
.container span {
  color: rgba(78, 158, 250, 0.795);
}
  .card {
      width: 270px;
      background:  rgba(78, 158, 250, 0.795);
      margin: 10px auto;
      border-radius: 5px;
      font-family: "Comfortaa", cursive;
      display:grid;
      grid-template-columns: 1fr 1fr; 
      height: 80px;
      display: flex;
      align-items: center;

  }
   .cardDos {
      width: 270px;
      background:  rgb(78, 158, 250);
      margin: 10px auto;
      border-radius: 5px;
      display:grid;
      grid-template-columns: 1fr 1fr; 
      font-family: "Comfortaa", cursive;
       height: 80px;
      display: flex;
      align-items: center;


  }
  .card p, .cardDos p {
    font-size: 15px;
    padding: 10px;
    margin: auto;

  }
     
 .card  .verLink {
   font-size: 18px;
   background: #333;
   border-radius: 5px;
   color: #fff;
   display: flex;
   align-items: center;
   justify-content: center;
   cursor: pointer;
   height: 80px;
   width: 100px;


 }    
 .cardDos .verLink {
    font-size: 18px;
   background: rgb(68, 67, 67);
   border-radius: 5px;
   color: #fff;
   display: flex;
   align-items: center;
   justify-content: center;
   cursor: pointer;
   height: 80px;
   width: 100px;
 }
 a {
   text-decoration: none;
 }
  
.cardTres {
  background:  rgba(78, 158, 250, 0.192);
  width: 270px;
  margin:  auto;
  margin-top: 20px;

}
.cardTres p {
  padding: 20px;
  font-family: "Comfortaa", cursive;

}
.cardTres .btn {
    background:rgba(78, 158, 250, 0.733);
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    border: 2px solid rgb(78, 158, 250);
    border-radius: 5px;
    font-weight: bold;
    font-family: "Comfortaa", cursive;

  }
 

  .icons i{
    font-size: 30px;
    color: rgb(78, 158, 250);
    margin: 7px;
    margin-bottom: 20px;
  }

  /* ################### TABLETS ############################### */

  @media (min-width: 500px){

    .container {
		  margin-top: 50px;
	  }

    .container h1 {
      font-size: 50px;
    }

    .cardTres {
      width: 450px;
    }
    .card, .cardDos {
       width: 450px;
      grid-template-columns: 1fr 2fr; 


    }
  }


  </style>