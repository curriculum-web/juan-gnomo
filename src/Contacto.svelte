<script>
  import { fly} from 'svelte/transition';

</script>


<div class="container" in:fly="{{x:-300, duration: 600}}">
<div class="card">
<div class="card-content">
<img src="./img/gnomo.png" alt="Foto de Juan Gnomo">
<h1><span>Juan</span> Gnomo</h1>
<p class="phone">Argentina. Bosque Encantado. Buenos Aires</p>
<p class="phone"><i class="fas fa-phone-alt"></i> <span>+54 2392 15 462524</span></p>
     <div class="icons"><a href="https://github.com/EnzoDaneri" target="blank"><i class="fab fa-github"></i></a>
     <a href="https://wa.me/542392462524/?text=Hola!.%20Vi%20tu%20perfil%20"><i class="fab fa-whatsapp"></i></a>
     <a href="https://www.linkedin.com/in/enzo-adri%C3%A1n-daneri-desarrollo-web/"target="blank"><i class="fab fa-linkedin-in"></i></a>
     <a href="https://www.facebook.com/enzodaneri"target="blank"><i class="fab fa-facebook-f"></i></a>
     <a href="https://www.instagram.com/danerienzo/" target="blank"><i class="fab fa-instagram"></i></a>
</div>
<div class="curriculum">
<a  href="curriculum-juan-gnomo.pdf" target="blank"> <p ><i class="far fa-address-card"></i>   Mi C.V</p>
 </a>
</div>
</div>
</div>
</div>


<style>
.container {
    text-align: center;
    margin-top: 35px;
}

.container h1 {
	font-family: "Satisfy", cursive;
	font-weight: normal;
	font-size: 35px;
	color: #333;
	margin: 20px;
}
.container span {
	color: rgba(78, 158, 250, 0.897);
}
.phone {
    color: #333;
    margin-bottom: 30px;
    font-family: "Comfortaa", cursive;
    margin-top: 10px;

}

.card {
  width: 270px;
  margin: auto;

}
.card img{
 width: 100px;
 border-radius: 50%;
 border: 5px solid rgba(78, 158, 250, 0.568);

}
 .icons i{
    font-size: 30px;
    color: rgb(78, 158, 250);
    margin: 7px;
    margin-bottom: 20px;
  }
  .curriculum {
      font-size: 20px;
      margin-top: 40px;
    font-family: "Comfortaa", cursive;

  }
  .curriculum i {
    color: rgb(78, 158, 250);
    font-size: 35px;

  }
  .curriculum a {
    text-decoration: none;
    color: rgb(78, 158, 250);

  }


   /* ################### TABLETS ############################### */

  @media (min-width: 500px) {
	  .container {
          margin-top: 50px;
          font-size: 20px;
        
	  }

	  .container h1 {
		  font-size: 40px;
	  }

	 .container img {
		 width: 130px;
         border: 5px solid rgba(78, 158, 250, 0.568);

     }
     .card {
         width: 450px;
     }
  }

</style>