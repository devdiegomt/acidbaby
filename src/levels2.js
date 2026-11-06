// Temporada 2: «Las profundidades». Debajo del templo hay cuevas, y los niveles van por mundos.
// Cada nivel tiene el mismo formato que los de levels.js (ver allí la leyenda completa) y se
// puede dibujar con el editor. Casillas que estrena esta temporada:
//   ⚑      bandera de control: se enciende cuando los tres están junto a ella. Si después
//          alguien cae (o se pulsa R), todo vuelve a como estaba al encenderla, con las vidas llenas.
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
      ],
    },
  ],
};
