import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Appointment from '../models/Appointment';
import User from '../models/User';

class AppointmentController {
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });
    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validação de dados falhou' });
    }
    const { provider_id, date } = req.body;

    // Checar se o provider_id é um provider

    const isProvider = await User.findOne({
      // onde o id recebe o valor do provider_id e o provider tem que ser true
      where: { id: provider_id, provider: true },
    });
    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'Você só pode marcar um horário com um provider' });
    }

    // check para datas passadas

    const hourStart = startOfHour(parseISO(date)); // padronizar horario e tirar os minutos
    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Esta data já passou!' });
    }
    // check  se data está disponível
    const checkAvailability = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });
    if (checkAvailability) {
      return res.status(400).json({ error: 'Horário não disponível' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
