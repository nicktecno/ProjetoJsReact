import Notification from '../schemas/Notification';
import User from '../models/User';

class NottificationController {
  async index(req, res) {
    const checkIsProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });

    if (!checkIsProvider) {
      return res
        .status(401)
        .json({ error: 'Apenas um provider pode carregar notificações' });
    }

    const notifications = await Notification.find({
      user: req.userId,
    })
      .sort({ createdAt: 'desc' })
      .limit(20); // Por ser no mongodb o método para listar todos é find ao invés de findall
    // sort é organizar e limit é a quantidade de notificaçoes que aparecerão

    return res.json(notifications);
  }

  async update(req, res) {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
      // recurso do mongoose para achar e ja atualizar, é necessario a chave new para escrever a modificaçao
    );
    return res.json(notification);
  }
}

export default new NottificationController();
