import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';

import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointment';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;
    // vai pegar do insomnia no parametro query aí fica o ? page=1 por padrao vai ficar na pagina 1

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      limit: 20,
      offset: (page - 1) * 20, // quantos registros pulam por pagina
      attributes: ['id', 'date', 'past', 'cancelable'],
      include: [
        {
          // como quero listar tudo junto em um campo apenas se torna necessário o associate de models para poder listar tudo depois
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

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

    /** Notificação de Provider

     */
    const user = await User.findByPk(req.userId);
    const formattedDate = format(hourStart, "'dia' dd 'de' MMM', às' H:mm'h'", {
      locale: pt,
    });

    await Notification.create({
      content: `Novo agendamento de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          // foi acrescentado o model User, com o relacionamento do provider o nome e o email
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: 'Você não tem permissão para cancela esse agendamento',
      });
    }
    const dateWithSub = subHours(appointment.date, 2); // subtrai duas horas do appointment.date
    if (isBefore(dateWithSub, new Date())) {
      // Verificaçao se o horario atual está antes de -2 horas do horario do agendamento que é o valor do dateWithSub
      return res.status(401).json({
        error: 'Você só pode cancelar 2 horas antes do seu agendamento',
      });
    }
    appointment.canceled_at = new Date();

    await appointment.save();
    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}
export default new AppointmentController();
