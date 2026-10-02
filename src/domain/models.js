export const domainModels = {
  user: ['id', 'displayName', 'level', 'avatarUrl', 'retroAchievementsUsername', 'retroAchievementsConnectedAt'],
  club: ['id', 'name', 'description', 'memberCount'],
  round: ['id', 'clubId', 'status', 'endsAt'],
  game: ['id', 'title', 'coverUrl', 'membersFinished', 'memberCount', 'roundId', 'retroAchievementsId', 'retroAchievementsHash'],
  activity: ['id', 'userName', 'action', 'achievement', 'gameTitle', 'createdAt'],
}
