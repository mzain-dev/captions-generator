export interface TitleCardSettings {
  enabled: boolean;
  text: string;
  subtitle: string;
  durationInSeconds: number;
  backgroundColor: string;
  textColor: string;
}

export const DEFAULT_INTRO_SETTINGS: TitleCardSettings = {
  enabled: false,
  text: "",
  subtitle: "",
  durationInSeconds: 2.5,
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
};

export const DEFAULT_OUTRO_SETTINGS: TitleCardSettings = {
  enabled: false,
  text: "Thanks for watching",
  subtitle: "",
  durationInSeconds: 2.5,
  backgroundColor: "#000000",
  textColor: "#FFFFFF",
};
