<script>
  import { fly, fade} from 'svelte/transition';


</script>


<div class="container"  in:fly="{{x:-300, duration: 600}}">
 <h1>Info</h1>
<h2 ><span>Cuidado de</span> Tesoros</h2>


<div class="card">
<div class="card-content">
<p>La custodia de tesoros se realiza con estrictos protocolos de seguridad mágica.</p>
</div>
</div>

<div class="cardDos">
<div class="card-content">
<p>Amplio conocimiento del bosque y todos sus recovecos</p>
</div>
</div>


<div class="card">
<div class="card-content">
<p>Por USD 30 tienes la custodia durante 1 mes </p>
</div>
</div>


<div class="cardDos">
<div class="card-content">
<p>La frecuencia será a convenir</p>
</div>
</div>

</div>

<style>
.container {
    text-align: center;
    margin-top: 20px;
    margin-bottom: 90px;

}
.container h1 {
font-family: "Comfortaa", cursive;
font-weight: normal;
color: rgba(78, 158, 250, 0.795);
font-size: 40px;

}
.container h2 {
    color: #333;
   font-family: "Satisfy", cursive;
   margin-top: 10px;

}
.container span {
        font-family: "Satisfy", cursive;
         color: rgba(78, 158, 250, 0.795);

}
.card { 
      width: 270px;
      background:  rgba(78, 158, 250, 0.548);
      margin: 10px auto;
      border-radius: 5px;
      font-family: "Comfortaa", cursive;
      color:#333;
      margin-top: 20px;
      padding: 20px;
}
 
.cardDos {
    background:  rgba(78, 158, 250, 0.192);
    color:#333;
    margin-top: 20px;
    padding: 20px;
    border-radius: 5px;
    font-family: "Comfortaa", cursive;
     width: 270px;
     margin: auto;


}


  /* ################### TABLETS ############################### */

  @media (min-width: 500px){

       .container {
		  margin-top: 50px;
	  }

       .container h1 {
      font-size: 50px;
    }

    .card, .cardDos {
       width: 450px;

    }
  }


</style>