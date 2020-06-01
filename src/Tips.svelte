<script>
import { fly} from 'svelte/transition';


</script>
<div class="icon"><i class="fas fa-check"></i></div>

<div in:fly="{{x: -300, duration: 600}}" class="containerTips">

<div class="tipUno"><p> La Puntualidad siempre es una hermosa virtud ... practícala! </p> </div>

<div class="tipDos"><p>  La Discreción te aporta valor y es apreciada por muchas personas... </p> </div>

<div class="tipUno"><p> Siempre pensá a largo plazo. Ganá una buena reputación y esmerate para mantenerla... </p> </div>

<div class="tipDos"><p> Cada día se aprende algo. Mantenete siempre actualizado. </p> </div>

</div>




<style>

.icon {
    text-align: center;
    margin-top: 20px;
    margin-bottom: -35px;
}
 
 i {
    font-size: 30px;
    color: rgba(78, 158, 250, 0.897);
    
}

.containerTips {
    padding: 50px;
    text-align: center;
    font-size: 17px;
   margin-bottom: 90px;
}

.tipUno {
  background:  rgba(78, 158, 250, 0.192);
    color:#333;
    margin-top: 20px;
    padding: 20px;
    border-radius: 5px;
    font-family: "Comfortaa", cursive;


}

.tipDos {
   background:  rgba(78, 158, 250, 0.438);
    color:#333;
    margin-top: 20px;
    padding: 20px;
    border-radius: 5px;
    font-family: "Comfortaa", cursive;

}


@media(min-width:620px){
 .containerTips {
 display: grid;
 grid-template-columns: 1fr 1fr;
 grid-gap: 20px;
 }
 
}

/*###################### TABLET############################# */
@media (min-width: 500px) and (max-width:800px ){
   
.containerTips {
    text-align: center;
    font-size: 20px;
   margin-bottom: 90px;
}
}


</style>