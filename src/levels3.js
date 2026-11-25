// Temporada 3: «Las alturas». Salieron de las profundidades: ahora toca subir montañas, cruzar
// islas en las nubes y tormentas hasta la cumbre. Mismo formato que levels.js y levels2.js (ver
// allí la leyenda). Casillas que estrena esta temporada:
//
// La montaña helada (Mundo 1):
//   _      suelo de hielo: resbala (cuesta arrancar y al soltar se sigue deslizando). A Chispa no:
//          su calor derrite la capa de encima.
//   ◇      agua congelada: suelo (resbaladizo) para todos. Si Chispa la pisa o la toca, al rato se
//          derrite entera (todas las ◇ pegadas) y vuelve a ser agua. ¡Que Chispa pase de última!
//   En el hielo, una caja (o un barril) empujada sale patinando hasta chocar con algo.
//   Ш      el Yeti de la cumbre (jefe): necesita un lago de agua congelada. Persigue por el suelo
//          (también sobre el lago), da zarpazos y de lejos lanza bolas de nieve (a Chispa no le hacen
//          nada). Si el lago se derrite bajo él, se hunde (aguanta 4), sale a la orilla y lo vuelve a
//          congelar. yeti: { name, left, right }. Al caer se rompen los sellos /

// Las islas flotantes (Mundo 2):
//   ☁      nube: se atraviesa saltando desde abajo (y de lado) y aguanta a quien cae encima.
//   gust: { dir: 1 | -1 | "alternate", calm, blow, strength, offset }  ráfagas de viento: cada
//          calm + blow frames sopla de lado durante blow frames (avisa antes), empujando a los tres
//          strength píxeles por frame. Detrás de una pared (hasta 3 casillas) no empuja.
//          "alternate" cambia de sentido en cada ráfaga.
//   Ѱ      el Ave de la tormenta (jefe): vuela por arriba y, por turnos, se lanza en picada contra
//          alguien, bate las alas (ráfagas que soplan alejándose de ella; el nivel no lleva "gust") o
//          lanza un rayo sobre la columna de cada uno (avisa; bajo un techo no llega). Si se estrella
//          contra el suelo queda mareada: saltarle encima es un golpe (aguanta 4).
//          storm: { name, left, right }. Al caer se rompen los sellos /.

// La tormenta (Mundo 3):
//   ▓      nubarrón: no es sólido. Cada calm + pour frames llueve debajo durante pour frames (avisa
//          goteando), hasta la primera casilla sólida o caja. A Chispa la lluvia le quita vidas; la
//          sal (=) que moja se disuelve y la lava (L) que moja se enfría en obsidiana (■).
//          rain: { calm, pour, offset }
//   ≡      suelo de metal: cada calm + zap frames cae un trueno (avisa) y durante zap frames el metal
//          da descarga a quien lo toque. Con un salto a tiempo se esquiva. thunder: { calm, zap, offset }
//   La lluvia también apaga las antorchas (†/‡) que moja.
//   ☈      la Nube negra (jefe): persigue a Chispa por arriba y le llueve encima. Cuando su lluvia apaga
//          una antorcha encendida, hierve: un golpe (aguanta 4); esa antorcha queda empapada un rato y
//          no se puede volver a encender. Necesita antorchas. nimbus: { name, left, right }.

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
        {
          name: "Cajas que patinan",
          hint: "En el hielo, una caja empujada sale patinando hasta chocar. Mándenla al botón de la compuerta.",
          mechanisms: {
            g: { trigger: "button", move: [0, -5] },
          },
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
            "#                                      #",
            "#                                      #",
            "#                              g       #",
            "#                              g       #",
            "#                         z    g       #",
            "#            r       e         g       #",
            "#fwb     x                  G# g  1 2 3#",
            "######_______LL______AA______###########",
          ],
        },
        {
          name: "El muro de hielo",
          hint: "Chispa derrite el muro de hielo… y también el lago congelado. ¿Quién cruza primero?",
          map: [
            "########################################",
            "########################################",
            "########################################",
            "########################################",
            "##  ####  ##  ###  ####  ##  ####  ### #",
            "#    ##        #    ##        #     #  #",
            "#                       +              #",
            "#                       +              #",
            "#                       +              #",
            "#                       +              #",
            "#              e        +              #",
            "##### ################# +              #",
            "#                       +              #",
            "#                       +              #",
            "#                       +              #",
            "#             z         +     r        #",
            "#fwb ^                  +         1 2 3#",
            "#######◇◇◇◇◇◇◇◇◇◇◇◇◇◇#########LL########",
          ],
        },
        {
          name: "La cumbre helada",
          hint: "Todo lo de la montaña: hielo, una caja que patina y agua congelada. Enciendan la bandera.",
          mechanisms: {
            g: { trigger: "button", move: [0, -5] },
          },
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
            "#                                      #",
            "#                                      #",
            "#                          g           #",
            "#                          g           #",
            "#                          g           #",
            "#       r   e              g   z       #",
            "#fwb            ⚑   x    G#g      1 2 3#",
            "####____LL__AA_###________###◇◇◇◇◇######",
          ],
        },
        {
          name: "El Yeti de la cumbre",
          hint: "Atraigan al Yeti sobre el lago (Gota aguanta el agua) y que Chispa lo derrita: se hunde. Él lo vuelve a congelar.",
          yeti: { name: "El Yeti de la cumbre", left: 1, right: 33 },
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
            "# e                                    #",
            "####                                   #",
            "#                                 /    #",
            "#                                 /    #",
            "#           z                     /    #",
            "#                  r              /    #",
            "#fwb;                     Ш       /123 #",
            "#######◇◇◇◇◇◇◇◇◇◇◇◇##◇◇◇◇◇◇◇◇◇◇◇◇#######",
          ],
        },
      ],
    },
    {
      name: "Las islas flotantes",
      theme: "sky",
      levels: [
        {
          name: "Entre nubes",
          hint: "Las nubes se atraviesan saltando desde abajo y aguantan a quien cae encima. ¡Arriba!",
          map: [
            "########################################",
            "#                                      #",
            "#                              1 2 3   #",
            "#                          #############",
            "#             e                        #",
            "#            ☁☁☁☁    ☁☁☁☁☁             #",
            "#                                      #",
            "#                 ☁☁☁☁☁                #",
            "#                       z              #",
            "#              ☁☁☁☁☁  ☁☁☁☁             #",
            "#                                      #",
            "#           ☁☁☁☁☁                      #",
            "#  r                                   #",
            "# ☁☁☁☁   ☁☁☁☁☁                         #",
            "#                                      #",
            "#     ☁☁☁☁☁                            #",
            "#fwb                                   #",
            "######~~~~AAAALLLL~~~~AAAALLLL~~~~AAAAL#",
          ],
        },
        {
          name: "Ráfagas",
          hint: "El viento cambia de lado en cada ráfaga. Detrás de un pilar no empuja: escóndanse ahí y crucen cuando esté en calma.",
          gust: { dir: "alternate", calm: 240, blow: 100, strength: 1.6 },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#             r     z       e          #",
            "#       #     #    ☁☁☁      #    #     #",
            "#fwb    #     #             #    #1 2 3#",
            "#########  #######     ######### #######",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#~~~~AAAALLLL~~~~AAAALLLL~~~~AAAALLLL~~#",
          ],
        },
        {
          name: "Corrientes entre nubes",
          hint: "El aire de los ventiladores atraviesa las nubes. Lleven la caja al botón para abrir la compuerta de arriba.",
          mechanisms: {
            g: { trigger: "button", move: [0, -2] },
          },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                        g             #",
            "#                1 2 3   g             #",
            "#              ################## ######",
            "#                                      #",
            "#                                      #",
            "#        e                             #",
            "#       ☁☁☁         r    z             #",
            "#                            x G#^     #",
            "#      ########  ☁☁☁  ☁☁☁  #######     #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#fwb  ^                                #",
            "########LLLL~~~~AAAALLLL~~~~AAAALLLL~~~#",
          ],
        },
        {
          name: "Tablones al viento",
          hint: "El viento siempre sopla hacia la derecha. El hueco grande solo se salta con la ráfaga a favor… ¡y los tablones se caen al pisarlos!",
          gust: { dir: 1, calm: 180, blow: 110, strength: 1.6 },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                              e       #",
            "#                           ☁☁☁☁☁      #",
            "#                                      #",
            "#                                      #",
            "#                    r                 #",
            "#     #      #            #     z #    #",
            "#fwb  #      #            #   ;   #123 #",
            "#######------####--     #######---######",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#~~~AAAALLLL~~~~AAAALLLL~~~~AAAALLLL~~~#",
          ],
        },
        {
          name: "La isla del viento",
          hint: "Todo lo de las islas: escóndanse detrás de los pilares, enciendan la bandera y pongan la caja en el botón de arriba.",
          gust: { dir: "alternate", calm: 240, blow: 100, strength: 1.6 },
          mechanisms: {
            g: { trigger: "button", move: [0, -3] },
          },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#    #   g      r   #                  #",
            "# 123#   g          #G   x ?           #",
            "##########----------######### #        #",
            "#                             #        #",
            "#                             #        #",
            "#             e     z         #        #",
            "#       #     #    ☁☁☁    #   #        #",
            "#fwb    #     #         ⚑ #  ^#        #",
            "#########  #######     ########        #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#~~~AAAALLLL~~~~AAAALLLL~~~~AAAALLLL~~~#",
          ],
        },
        {
          name: "El Ave de la tormenta",
          hint: "¡El Ave de la tormenta! Cuando bata las alas, escóndanse detrás de los bloques para que el viento no los tire a los charcos.",
          storm: { name: "El Ave de la tormenta", left: 1, right: 38 },
          map: [
            "########################################",
            "#                                      #",
            "#                  Ѱ                   #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                 ######",
            "#   ####                     #### /    #",
            "#                 ☁☁☁☁            /    #",
            "#fwb     #      #      #      #   /123 #",
            "###########~~######AA#####LL############",
            "########################################",
            "########################################",
            "########################################",
          ],
        },
      ],
    },
    {
      name: "La tormenta",
      theme: "storm",
      levels: [
        {
          name: "Primeras gotas",
          hint: "Llueve debajo de los nubarrones: a Chispa la lluvia le quita vidas, pero disuelve la sal y enfría la lava.",
          rain: { calm: 180, pour: 120 },
          map: [
            "########################################",
            "#                                      #",
            "#               ▓▓▓▓▓▓  ▓     ▓▓▓▓     #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                 z                    #",
            "#                      ===             #",
            "#fwb                   =e=     r  1 2 3#",
            "################LLLLLL##################",
          ],
        },
        {
          name: "Suelo de metal",
          hint: "Con cada trueno el metal da descarga. ¡Salten o salgan del metal cuando avise! La caja no siente nada.",
          thunder: { calm: 200, zap: 24 },
          mechanisms: {
            g: { trigger: "button", move: [0, -4] },
          },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                          g           #",
            "#         r          e     g           #",
            "#                          g           #",
            "#fwb                 x  G# g  z    123 #",
            "#####≡≡≡AA≡≡≡###≡≡≡≡≡≡≡≡≡###≡≡≡≡≡≡######",
          ],
        },
        {
          name: "Tejados",
          hint: "Llueve más de lo que escampa: Chispa, espera bajo los tejados y corre al siguiente cuando pare.",
          rain: { calm: 130, pour: 150 },
          map: [
            "########################################",
            "#                                      #",
            "#       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#          ###   z ### e   ###         #",
            "#               =       =              #",
            "#fwb            =       =r         123 #",
            "######################LL################",
          ],
        },
        {
          name: "Escaleras de metal",
          hint: "Los ventiladores suben a repisas de metal. ¡Crúcenlas entre trueno y trueno!",
          thunder: { calm: 210, zap: 24 },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                     z                #",
            "#                                  123 #",
            "#                  ≡≡≡≡≡≡≡≡≡≡###########",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#           r                          #",
            "#                 ^                    #",
            "#      ≡≡≡≡≡≡≡≡≡###                    #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#fwb  ^              e                 #",
            "####################AAA#################",
          ],
        },
        {
          name: "El corazón de la tormenta",
          hint: "Lluvia, metal y truenos. Enciendan la bandera y crucen el último tramo cuando no llueva ni truene.",
          rain: { calm: 150, pour: 120 },
          thunder: { calm: 200, zap: 24 },
          mechanisms: {
            g: { trigger: "button", move: [0, -4] },
          },
          map: [
            "########################################",
            "#                                      #",
            "#     ▓▓▓▓▓▓▓▓▓▓               ▓▓▓▓    #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                          g           #",
            "#      e ###               g           #",
            "#            =             g           #",
            "#fwb         =      z x  G#g ⚑   r  123#",
            "##############LL##≡≡≡#≡≡≡≡≡####≡≡≡≡#####",
          ],
        },
        {
          name: "La Nube negra",
          hint: "¡La Nube negra persigue a Chispa! Gota y Acidito: abran las jaulas de las antorchas y cuidado con el metal.",
          nimbus: { name: "La Nube negra", left: 1, right: 33 },
          thunder: { calm: 260, zap: 24 },
          map: [
            "########################################",
            "#                                      #",
            "#                                      #",
            "#                  ☈                   #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                      #",
            "#                                 ######",
            "#                                 /    #",
            "#                                 /    #",
            "#               ===       %%%     /    #",
            "#fwb†           =†=       %†%     /123 #",
            "#########≡≡≡≡≡≡####≡≡≡≡≡≡#####≡≡≡#######",
          ],
        },
      ],
    },
  ],
};

// La cumbre (Mundo 4): el desafío final. Un solo nivel con varias salas seguidas, una por jefe de
// las temporadas 2 y 3 (con sus mismas reglas y sin gemas), y al final un jefe nuevo. Se pasa de
// sala al llegar a las puertas, con las mismas vidas y el mismo reloj; al caer se vuelve al
// principio de la sala. Cada sala lleva el tema de su mundo.
(() => {
  const find = (s, name) => {
    for (const w of s.worlds) {
      const lv = w.levels.find((l) => l.name === name);
      if (lv) return { lv, theme: w.theme || s.theme };
    }
    throw new Error(`No encuentro el nivel "${name}" para el desafío final`);
  };
  const room = (s, levelName, extra = {}) => {
    const { lv, theme } = find(s, levelName);
    return { ...lv, theme, ...extra, map: lv.map.map((row) => row.replace(/[rze]/g, " ")) };
  };
  SEASON_3.worlds.push({
    name: "La cumbre",
    theme: "ice",
    levels: [
      {
        name: "El desafío final",
        hint: "Todos los jefes, una sala tras otra, con las mismas vidas. Si alguien cae, vuelven al principio de la sala.",
        rooms: [
          room(SEASON_2, "Corazón de magma", { name: "El Gólem de magma" }),
          room(SEASON_2, "El Cangrejo hirviente"),
        ],
      },
    ],
  });
})();
