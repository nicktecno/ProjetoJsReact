import {
  startOfDay,
  endOfDay,
  setHours,
  setMinutes,
  setSeconds,
  format,
  isAfter,
} from 'date-fns';
import { Op } from 'sequelize';
import Appointment from '../models/Appointment';

class AvailableController {
  async index(req, res) {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Data Inválida' });
    }
    const searchDate = Number(date);

    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.params.providerId, // pega la da barra de endereço
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(searchDate), endOfDay(searchDate)],
        },
      },
    });

    const schedule = [
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
    ];

    const available = schedule.map((time) => {
      const [hour, minute] = time.split(':'); // desestruturação para pegar no primeiro hour e no segundo minutes

      const value = setSeconds(
        setMinutes(setHours(searchDate, hour), minute),
        0
      );
      // transformar o horario marcado igual ao horario do schedule 08:00 zerando os minutos e segundos

      return {
        time,
        value: format(value, "yyyy-MM-dd'T'HH:mm:ssxxx"),
        available:
          isAfter(value, new Date()) &&
          !appointments.find((a) => format(a.date, 'HH:mm') === time),
        // verificaçao  para verificar se o horario do agendamento bate com o horario da lista schedule
      };
    });

    return res.json(available);
  }
}

export default new AvailableController();
