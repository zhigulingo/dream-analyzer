// bot/functions/bot/handlers/golive-command.js

/**
 * Admin-only command: /golive <tg_id>
 * Immediately opens beta access for the specified user and notifies them.
 */
function createGoLiveCommandHandler(userService, messageService, adminIds = []) {
  const adminSet = new Set((adminIds || []).map(id => String(id).trim()).filter(Boolean));

  return async (ctx) => {
    try {
      const callerId = ctx.from?.id;
      if (!callerId || !adminSet.has(String(callerId))) {
        await messageService.sendReply(ctx, 'Недостаточно прав.');
        return;
      }
      const parts = String(ctx.message?.text || '').split(/\s+/);
      if (parts.length < 2 || !/^\d+$/.test(parts[1])) {
        await messageService.sendReply(ctx, 'Использование: /golive <tg_id>');
        return;
      }
      const targetId = Number(parts[1]);

      // Open access now
      const changed = await userService.openAccessNow(targetId);
      if (!changed) {
        await messageService.sendReply(ctx, 'Доступ уже открыт или пользователь не найден.');
        return;
      }

      // Notify target user via bot
      try {
        await messageService.api.sendMessage(targetId, 'Бета-доступ открыт администратором. Можете начинать пользоваться приложением.');
      } catch (_) {}

      await messageService.sendReply(ctx, `Открыт доступ для ${targetId}.`);
    } catch (e) {
      await messageService.sendReply(ctx, `Ошибка: ${e?.message || 'неизвестная'}`);
    }
  };
}

module.exports = createGoLiveCommandHandler;
