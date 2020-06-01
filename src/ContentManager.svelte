<script>
  import { fly, fade} from 'svelte/transition';


</script>


<div class="container"  in:fly="{{x:-300, duration: 600}}">
<h1>Travesuras en gral.</h1>


<div class="card">
<div class="card-content">
<i class="fas fa-candy-cane"></i>
<p> Todo tipo de travesuras para particulares y empresas</p>
    <div class="icons"><a href="https://github.com/EnzoDaneri" target="blank"><i class="fab fa-github"></i></a>
     <a href="https://www.linkedin.com/in/enzo-adri%C3%A1n-daneri-desarrollo-web/"target="blank"><i class="fab fa-linkedin-in"></i></a>
     <a href="https://www.facebook.com/enzodaneri"target="blank"><i class="fab fa-facebook-f"></i></a>
     <a href="https://www.instagram.com/danerienzo/" target="blank"><i class="fab fa-instagram"></i></a>


</div>
</div>
</div>

    <a href="https://wa.me/542392462524/?text=Hola!.%20">
    <div class="btn">Contactar</div></a>
</div>
 
<style>

 .container {
      text-align: center;
      margin-top: 30px;
      margin-bottom: 90px;
  }
  .card i {
      font-size: 90px;
      color: #333;
      margin-bottom: 20px;
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
   text-align: center;
   margin: 20px auto;
   padding: 20px;
   border-radius: 5px;
   background:  rgba(78, 158, 250, 0.192);

}
.card p {
    color: #333;
    font-family: "Comfortaa", cursive;
    font-size: 18px;
    margin-bottom: 15px;
}
 .icons i{
    font-size: 30px;
    color: rgb(78, 158, 250);
    margin: 7px;
    margin-bottom: 20px;
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
    font-family: "Comfortaa", cursive;
    width: 270px;
    margin: auto;
    margin-top: -20px;
  }
   a {
    text-decoration: none;
    color: #333;
    display: inline;

  }

  /* ################### TABLETS ############################### */

  @media (min-width: 500px){

    .container {
		  margin-top: 50px;
	  }

    .container h1 {
      font-size: 50px;
    }
    .card {
        width: 450px;

    }
    .btn {
        width: 450px;
    }

  }
</style>
