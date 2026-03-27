import { StreamSuggestion } from '../infrastructure/models.js';

export async function getSuggestions(userId) {
  return StreamSuggestion.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 100,
    attributes: ['id', 'text', 'suggestedBy', 'createdAt'],
  });
}

export async function deleteSuggestionById(userId, suggestionId) {
  return StreamSuggestion.destroy({
    where: { id: suggestionId, userId },
  });
}

