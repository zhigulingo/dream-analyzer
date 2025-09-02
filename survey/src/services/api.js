import axios from 'axios';

const base = import.meta.env.VITE_FUNCTIONS_BASE_URL || '/api';

export async function getSurveyStatus() {
  const { data } = await axios.get(base + '/survey-status', { withCredentials: true });
  return data;
}

export async function submitSurvey(answers, clientId) {
  const { data } = await axios.post(base + '/submit-survey', { answers, clientId }, { withCredentials: true });
  return data;
}


