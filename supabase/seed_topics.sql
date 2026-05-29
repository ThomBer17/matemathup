-- Seed de temas — programa de matemática argentina 5°-6° secundaria.
-- Alineado con src/lib/curriculum.ts para que los slugs hagan match con el scope.

INSERT INTO public.topics (slug, name, description, icon, color, order_index) VALUES
  ('numeros-reales', 'Números Reales', 'Clasificación, intervalos, valor absoluto, raíces y propiedades del orden.', 'Sigma', 'sky', 1),
  ('algebra', 'Álgebra', 'Polinomios, factorización, ecuaciones e inecuaciones.', 'BracketsIcon', 'blue', 2),
  ('funciones', 'Funciones', 'Lineales, cuadráticas, racionales, exponenciales y logarítmicas.', 'Function', 'indigo', 3),
  ('trigonometria', 'Trigonometría', 'Razones, identidades, resolución de triángulos.', 'Triangle', 'violet', 4),
  ('logaritmos', 'Logaritmos', 'Propiedades, ecuaciones logarítmicas y exponenciales.', 'TrendingUp', 'teal', 5),
  ('sistemas-de-ecuaciones', 'Sistemas de Ecuaciones', 'Sistemas 2x2 y 3x3, métodos de resolución.', 'BracketsIcon', 'cyan', 6),
  ('geometria', 'Geometría', 'Pitágoras, semejanza, áreas, volúmenes.', 'Ruler', 'rose', 7),
  ('limites', 'Límites', 'Cálculo de límites, asíntotas, continuidad.', 'Infinity', 'sky', 8),
  ('derivadas', 'Derivadas', 'Reglas de derivación, optimización, monotonía.', 'TrendingUp', 'blue', 9),
  ('integrales', 'Integrales', 'Integral indefinida, definida, áreas.', 'Sigma', 'violet', 10),
  ('probabilidad', 'Probabilidad y Estadística', 'Combinatoria, probabilidad clásica, media y desvío.', 'TrendingUp', 'teal', 11)
ON CONFLICT (slug) DO NOTHING;
