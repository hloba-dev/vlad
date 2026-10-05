export type Feeding = {
  id: string;
  fed_at: string;
  amount_ml: number;
};

export type Toilet = {
  id: string;
  happened_at: string;
};

export type Sleep = {
  id: string;
  started_at: string;
  ended_at: string | null;
};
