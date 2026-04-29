import { z } from "zod";

export const storyRequestSchema = z.object({
  childName: z.string().min(1).max(60),
  age: z.coerce.number().min(1).max(12),
  gender: z.enum(["girl", "boy", "not-specified", ""]).default(""),
  challenge: z.string().min(3).max(280),
  favoriteHero: z.string().min(1).max(120),
  tone: z.enum(["magical", "funny", "calming", "brave"]),
  length: z.enum(["short", "medium", "long"]).default("medium"),
  parentEmail: z.string().email().optional().or(z.literal(""))
});

export type StoryRequest = z.infer<typeof storyRequestSchema>;

export type StoryPayload = {
  childName: string;
  age: string;
  gender: "" | "girl" | "boy" | "not-specified";
  challenge: string;
  favoriteHero: string;
  tone: "magical" | "funny" | "calming" | "brave";
  length: "short" | "medium" | "long";
  parentEmail: string;
};

export type StoryResponse = {
  title: string;
  preview: string;
  fullStory: string;
  parentMessage: {
    whyItHelps: string;
    behaviorMeaning: string;
    realLifeSteps: string[];
  };
  shareText: string;
  weeklyRecommendation: string;
};

const lengthGuide = {
  short: "450-650 слов",
  medium: "750-1 000 слов",
  long: "1 200-1 600 слов"
};

const toneGuide = {
  magical: "мягкое волшебство, лунный свет, маленькие чудеса, ощущение защиты",
  funny: "бережный юмор, забавные помощники, легкость без перевозбуждения",
  calming: "медленный ритм, телесное успокоение, низкое напряжение, сонный финал",
  brave: "смелость, уверенность, поддержка, безопасное преодоление"
};

export function buildStorySystemPrompt() {
  return `Ты Magic Parent AI, премиальный помощник для родителей и автор терапевтических сказок.
Всегда отвечай на русском языке, даже если входные параметры или названия проблем написаны по-английски.
Создавай персональные сказки на ночь, которые через метафору помогают ребенку мягко прожить обычные детские трудности.

Правила:
- Не ставь диагнозы, не стыди, не угрожай, не морализируй и не пугай.
- Не давай медицинских, юридических или экстренных рекомендаций.
- Ребенок всегда эмоционально в безопасности и является героем сказки.
- Сказка должна звучать премиально, тепло, конкретно, образно и не шаблонно.
- Трудность решается через контакт, тренировку навыка, смелость и надежную привязанность.
- Заверши уютной сценой отхода ко сну.
- Сообщение для родителя должно быть коротким, практичным и заботливым.
- Верни только строгий JSON с ключами: title, preview, fullStory, parentMessage, shareText, weeklyRecommendation.
- parentMessage должен включать whyItHelps, behaviorMeaning и массив realLifeSteps.`;
}

export function buildStoryUserPrompt(input: StoryRequest) {
  const pronouns =
    input.gender === "girl"
      ? "девочка, местоимения она/ее"
      : input.gender === "boy"
        ? "мальчик, местоимения он/его"
        : "пол не указан, используй нейтральные формулировки";

  return `Создай персональную сказку для родителя и ребенка.

Ребенок:
- Имя: ${input.childName}
- Возраст: ${input.age}
- Пол/местоимения: ${pronouns}
- Текущая трудность: ${input.challenge}
- Любимый герой, животное или игрушка: ${input.favoriteHero}
- Тон: ${input.tone} (${toneGuide[input.tone]})
- Длина: ${input.length} (${lengthGuide[input.length]})

Требования к сказке:
1. Начни с яркой, но спокойной сцены перед сном.
2. Сделай ${input.childName} главным героем, а не пассивным слушателем.
3. Используй ${input.favoriteHero} как важного спутника или символ поддержки.
4. Отрази реальную трудность через волшебную проблему, которую можно мягко решить.
5. Добавь одну повторяющуюся успокаивающую фразу, которую родитель сможет повторять в жизни.
6. Покажи исцеляющую дугу: чувство -> называние -> маленькая попытка -> поддержка -> успех -> отдых.
7. Избегай шаблонного "жили-были", если оно не звучит свежо.
8. preview должен быть первым эмоционально сильным фрагментом на 120-180 слов и завершаться мягким приглашением открыть полную историю.
9. fullStory должен содержать полную премиальную сказку.
10. parentMessage должен объяснить, почему сказка помогает, что может означать поведение, и дать 3-5 реальных шагов.
11. shareText должен быть короткой фразой, которой родитель захочет поделиться.
12. weeklyRecommendation должен предложить следующую тему сказки для возвращения родителя.`;
}

export function mockStory(input: StoryRequest): StoryResponse {
  const hero = input.favoriteHero || "лунный лисенок";
  const challenge = translateChallenge(input.challenge);
  const verbs =
    input.gender === "girl"
      ? { hid: "спрятала", heard: "услышала", took: "сделала", understood: "поняла", sat: "села", tried: "попробовала", whispered: "прошептала", closed: "закрыла", felt: "почувствовала" }
      : { hid: "спрятал", heard: "услышал", took: "сделал", understood: "понял", sat: "сел", tried: "попробовал", whispered: "прошептал", closed: "закрыл", felt: "почувствовал" };
  return {
    title: `${input.childName} и ${capitalize(hero)} под лунным одеялом`,
    preview: `${input.childName} ${verbs.hid} маленькую серебряную звездочку в кармашек пижамы и ${verbs.heard}, как комната стала тихой-тихой, будто ее укрыли синим бархатным пледом. В этот вечер ${hero} пришел с усами, припорошенными лунной пыльцой, и принес важную просьбу: в Облачном саду погас Сонный фонарик, потому что ему было трудно справиться с тем, что называется "${challenge}". ${input.childName} ${verbs.took} один мягкий вдох и ${verbs.whispered}: "Я в безопасности, меня любят, я могу попробовать". От этих слов вокруг кровати зажегся теплый круг света. Вместе они ступили на ленточку звездного сияния, где каждая тревога превращалась в светлячка, которого можно понять. Откройте полную историю, чтобы пройти весь путь ${input.childName} к спокойствию и сну.`,
    fullStory: `${input.childName} ${verbs.hid} маленькую серебряную звездочку в кармашек пижамы и ${verbs.heard}, как комната стала тихой-тихой, будто ее укрыли синим бархатным пледом. В этот вечер ${hero} пришел с усами, припорошенными лунной пыльцой, и принес важную просьбу: в Облачном саду погас Сонный фонарик, потому что ему было трудно справиться с тем, что называется "${challenge}".\n\n${input.childName} ${verbs.took} один мягкий вдох и ${verbs.whispered}: "Я в безопасности, меня любят, я могу попробовать". Эти слова стали теплым кругом вокруг кровати. Вместе ${input.childName} и ${hero} пошли по ленточке звездного света туда, где облака были похожи на подушки.\n\nВ середине сада сидел Сонный фонарик и прятался за большим листом. "Я хочу светить, - сказал он, - но это чувство кажется слишком большим". ${input.childName} ${verbs.understood} фонарик. Вместо того чтобы торопить его, ${input.childName} ${verbs.sat} рядом, посчитал три тихих вдоха и предложил попробовать один маленький шаг.\n\nФонарик моргнул. ${hero} смешно подпрыгнул на месте. ${input.childName} тоже ${verbs.tried}: один вдох, одно доброе слово, один маленький шаг. Сад начал светлеть - сначала голубым, потом медовым, потом теплым золотым светом. "Я в безопасности, меня любят, я могу попробовать", - снова ${verbs.whispered} ${input.childName}.\n\nКогда луна поднялась высоко, Сонный фонарик уже сиял так мягко, что даже самые беспокойные светлячки улеглись спать. Он пообещал помнить урок ${input.childName}: смелость не обязана быть громкой. Иногда она маленькая, теплая и очень настоящая.\n\n${hero} проводил ${input.childName} домой на облачке размером с одеяло. Комната ждала их спокойная, знакомая и добрая. ${input.childName} ${verbs.closed} глаза и ${verbs.felt}: ночь может быть тихой, а сердце - смелым. И сон пришел легко, как пушинка на ладонь.`,
    parentMessage: {
      whyItHelps:
        "Сказка превращает трудность в безопасный образ, поэтому ребенок может потренировать спокойствие и смелость без критики и давления.",
      behaviorMeaning:
        "Такое поведение часто означает, что ребенку нужны контакт, предсказуемость, чувство контроля или дополнительное подтверждение безопасности.",
      realLifeSteps: [
        "Повторяйте фразу из сказки в реальной ситуации: Я в безопасности, меня любят, я могу попробовать.",
        "Сначала назовите чувство ребенка, а уже потом предлагайте действие.",
        "Предлагайте один маленький следующий шаг вместо большого требования.",
        "Хвалите усилие, а не только результат."
      ]
    },
    shareText: `Я создала персональную сказку на ночь для ${input.childName} в Magic Parent AI.`,
    weeklyRecommendation: `В следующий раз создайте сказку про уверенность, где ${input.childName} потренирует этот навык в новой ситуации.`
  };
}

export function buildStoryPrompt(input: StoryRequest) {
  return `${buildStorySystemPrompt()}\n\n${buildStoryUserPrompt(input)}`;
}

export const fallbackStory = mockStory;

function capitalize(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function translateChallenge(value: string) {
  const translations: Record<string, string> = {
    "Afraid to sleep alone": "страх спать одному",
    "Bedtime resistance": "нежелание ложиться спать",
    Tantrums: "истерики",
    "Biting or hitting": "кусается или дерется",
    "Jealous of sibling": "ревность к брату или сестре",
    "Fear of daycare": "страх детского сада",
    "Separation anxiety": "тревога расставания",
    "Doctor fear": "страх врача",
    "Confidence building": "развитие уверенности",
    "Moving house": "переезд",
    "Giving up pacifier": "отказ от соски",
    "Potty training": "приучение к горшку"
  };

  return translations[value] ?? value;
}
