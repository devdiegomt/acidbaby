// Temporada 3: «Las alturas». Salieron de las profundidades: ahora toca subir montañas, cruzar
// islas en las nubes y tormentas hasta la cumbre. Mismo formato que levels.js y levels2.js (ver
// allí la leyenda). Casillas que estrena esta temporada:
//
// La montaña helada (Mundo 1):
//   _      suelo de hielo: resbala (cuesta arrancar y al soltar se sigue deslizando). A Chispa no:
//          su calor derrite la capa de encima.
//   ◇      agua congelada: suelo (resbaladizo) para todos. Si Chispa la pisa o la toca, al rato se
//          derrite entera (todas las ◇ pegadas) y vuelve a ser agua. ¡Que Chispa pase de última!

const SEASON_3 = {
  id: "t3",
  name: "Temporada 3",
  subtitle: "Las alturas",
  theme: "ice",
  ending: {
    title: "¡Llegaron a la cumbre!",
    text: "Chispa, Gota y Acidito miran el mundo desde lo más alto, juntos.",
  },
  worlds: [
    {
      name: "La montaña helada",
      theme: "ice",
      levels: [
        {
          name: "Hielo fino",
          hint: "El hielo resbala (a Chispa no). El agua congelada aguanta… hasta que la pisa Chispa: ¡que pase de última!",
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
            "#                                      #",
            "#                            1 2 3     #",
            "#                           ######## ###",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                 e     z     r        #",
            "#fwb                                ^  #",
            "######____________AA##◇◇◇◇◇◇##LL########",
          ],
        },
        {
          name: "Cornisas heladas",
          hint: "Saltar desde el hielo es traicionero: frenen antes del borde. La cornisa de agua congelada, Chispa de última.",
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
            "#                                      #",
            "#         r           z     e          #",
            "#                                      #",
            "#                                      #",
            "#                                 1 2 3#",
            "#    ____  ____  ◇◇◇◇  ____  ____#######",
            "#                                #######",
            "#fwb#                            #######",
            "#####LLLL~~~~AAAALLLL~~~~AAAALLLL#######",
          ],
        },
      ],
    },
  ],
};
