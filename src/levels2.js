// Temporada 2: «Las profundidades». Debajo del templo hay cuevas, y los niveles van por mundos.
// Cada nivel tiene el mismo formato que los de levels.js (ver allí la leyenda completa) y se
// puede dibujar con el editor. Casillas que estrena esta temporada:
//   ⚑      bandera de control: se enciende cuando los tres están junto a ella. Si después
//          alguien cae (o se pulsa R), todo vuelve a como estaba al encenderla, con las vidas llenas.
//   ≈ ♨    barril de agua / de lava: se empuja como una caja. Al llegar a un charco del elemento
//          contrario (agua sobre lava, lava sobre agua) lo convierte entero en obsidiana y se gasta
//   ■      obsidiana: suelo para todos (la forman los barriles; también se puede dibujar)
//
// Estrellas de cada nivel: completarlo, coger todas sus gemas y pasarlo sin perder un corazón
// (ni volver a una bandera). Se pueden ganar en partidas distintas.
//
// Las casillas nuevas son símbolos de un solo carácter (como ⚑), nunca emojis: un emoji ocupa
// dos caracteres y descuadra las filas del mapa.

const SEASON_2 = {
  id: "t2",
  name: "Temporada 2",
  subtitle: "Las profundidades",
  theme: "caves",
  ending: {
    title: "¡Habéis salido de las profundidades!",
    text: "Fireboy, Watergirl y AcidBaby vuelven a la superficie, juntos otra vez.",
  },
  worlds: [
    {
      name: "Las cuevas de obsidiana",
      levels: [
        {
          name: "Bajada a las cuevas",
          hint: "Reuníos los tres junto a la bandera: si alguien cae, volveréis allí y no al principio.",
          map: [
            "############################################",
            "#########################                  #",
            "#########################                  #",
            "#########################                  #",
            "#########################                  #",
            "#########################                  #",
            "####################   ##  1  2  3   z     #",
            "############  ####      ################   #",
            "####   ####    ##                          #",
            "##      ##                       e         #",
            "#                                          #",
            "#                                   @    ; #",
            "#                            ###############",
            "#                                          #",
            "#                    ⚑                     #",
            "#                  #####                   #",
            "# fwb  r    z   e ######   ;          r   <#",
            "#######LL##~~##AA###########################",
          ],
        },
        {
          name: "Barriles",
          hint: "Un barril de agua convierte la lava en obsidiana, y uno de lava, el agua. ¡Ojo con el orden!",
          map: [
            "########################################",
            "########################################",
            "########################################",
            "########################################",
            "########################################",
            "###########  ####  #####################",
            "####  ####    ##    ####  ######  ######",
            "##     ##            ##    ####    ##  #",
            "#                           ##         #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                        z    e        #",
            "#              r             ###       #",
            "# fwb  ♨  ≈                      1 2 3 #",
            "#############LLLLL#####~~~~~############",
          ],
        },
        {
          name: "Una sola gota",
          hint: "Solo hay un barril de agua: ¿puente hacia las puertas, o las gemas y el camino alto?",
          map: [
            "########################################",
            "########################################",
            "########################################",
            "########################################",
            "##  ####  ##  ###  ####  ##  ####  ### #",
            "#    ##        #    ##        #     #  #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#          &              r            #",
            "#              .                       #",
            "##   ###############-----###           #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#z ^ e       fwb ≈          r 1  2  3  #",
            "#######LLLL##########LLLLL##############",
          ],
        },
      ],
    },
  ],
};
