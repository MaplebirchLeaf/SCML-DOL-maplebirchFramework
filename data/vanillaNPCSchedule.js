// @ts-check
/// <reference path='../maplebirch.d.ts' />
(() => {
  'use strict';

  // Robin 的日程
  maplebirch.npc.Schedules.add('Robin', [0, 23], 'orphanage')
    .when(
      (date) => C.npc.Robin.init !== 1,
      () => '',
      'NotInit',
      { override: true }
    )
    .when(
      (date) => V.robinlocationoverride && V.robinlocationoverride.during.includes(date.hour),
      (date) => V.robinlocationoverride.location,
      'LocationOverride',
      { after: 'NotInit' }
    )
    .when(
      (date) => ['docks', 'landfill', 'dinner', 'pillory', 'mansion'].includes(V.robinmissing),
      (date) => V.robinmissing,
      'Missing',
      { after: 'LocationOverride' }
    )
    .when(
      (date) => !date.isHourBetween(7, 20),
      'sleep',
      'Sleeping',
      { after: 'Missing' }
    )
    .when(
      (date) => date.schoolDay && date.isHourBetween(8, 15),
      'school',
      'SchoolDay',
      { after: 'Sleeping' }
    )
    .when(
      (date) => date.isBetween([16, 31], [16, 59]),
      (date) => V.daily.robin.bath ? 'orphanage' : 'bath',
      'BathTime',
      { after: 'SchoolDay' }
    )
    .when(
      (date) => V.halloween === 1 && date.isHourBetween(16, 18) && date.month === 31,
      'halloween',
      'Halloween',
      { after: 'BathTime' }
    )
    .when(
      (date) => date.weekEnd && date.isHourBetween(9, 16) && C.npc.Robin.trauma < 80,
      (date) => date.winter ? 'park' : 'beach',
      'WeekendOuting',
      { after: 'Halloween' }
    )
    .when(
      (date) => V.englishPlay === 'ongoing' && V.englishPlayDays === 0 && date.isHourBetween(17, 20),
      'englishPlay',
      'EnglishPlay',
      { after: 'WeekendOuting' }
    );
    // 如果需要重新启用格威岚咖啡
    // .when(
    //   (date) => V.gwylanSeen?.includes('cafe_walk_robin') && V.robin.timer.hurt === 0 &&
    //             V.daily.robin_in_cafe && !between(V.chef_state, 7, 8) &&
    //             date.schoolDay && date.isBetween([8, 0], [8, 49]),
    //   'cafe',
    //   'Cafe',
    //   { after: 'SchoolDay' }  // 在学校日之后检查
    // )

  // Sydney 的日程
  maplebirch.npc.Schedules.add('Sydney', [0, 23], 'home')
    .when(
      (date) => date.schoolDay,
      (date) => {
        wikifier('schooleffects');
        return date.schedule
          .at([0, 5], 'home')
          .when(
            date => date.isBetween([6, 0], [9, 0]) && V.sydneyLate === 1,
            'late',
            'Late',
            { after: 'default' }
          )
          .at(6, 'temple')
          .when(
            date => date.isHourBetween(7, 8) || (date.isHour(9) && V.sydneyScience !== 1),
            'library',
            'MorningStudy',
            { after: 'Late' }
          )
          .at(9, 'science')
          .when(
            date => ['second', 'third'].includes(V.schoolstate),
            'class',
            'ClassTime',
            { after: 'MorningStudy' }
          )
          .when(
            date => V.schoolstate === 'lunch' && V.daily.school.lunchEaten !== 1 &&
              date.isMinuteBetween(0, 15),
            'canteen',
            'Lunch',
            { after: 'ClassTime' }
          )
          .when(
            date => V.englishPlay === 'ongoing' && V.schoolstate === 'afternoon',
            (date) => { T.sydney_location_message = 'rehearsal'; return 'rehearsal' },
            'Rehearsal',
            { after: 'Lunch' }
          )
          .when(
            date => date.isBetween([0, 0], [15, 0]) ||
              (date.isHour(16) && date.isMinuteBetween(0, 40)),
            date => V.daily.sydney.templeSkip ? 'temple' : 'library',
            'Afternoon',
            { after: 'Rehearsal' }
          )
          .at([16, 22], 'temple');
      },
      'SchoolDay',
      { insteadOf: 'default' }
    )
    .when(
      (date) => !Time.schoolTerm,
      (date) => date.isHourBetween(6, 22) ? 'temple' : 'home',
      'NoSchoolTerm',
      { after: 'SchoolDay' }
    )
    .when(
      (date) => V.sydneySeen !== undefined && V.adultshopunlocked &&
        C.npc.Sydney.corruption > 10 && date.isHourBetween(16, 19),
      (date) => {
        const corruption = C.npc.Sydney.corruption;
        return date.schedule
          .when(
            date => V.adultshophelped === 1,
            'temple',
            'ShopHelpDay',
            { after: 'default' }
          )
          .when(
            date => corruption > 10 && date.weekDay === 4,
            (date) => { T.sydney_location_message = 'shop'; return 'shop' },
            'ThursdayShop',
            { after: 'ShopHelpDay' }
          )
          .when(
            date => corruption > 20 && date.weekDay === 5,
            (date) => { T.sydney_location_message = 'shop'; return 'shop' },
            'FridayShop',
            { after: 'ThursdayShop' }
          )
          .when(
            date => corruption > 30 && date.weekDay === 3 && V.sydney.rank === 'initiate',
            (date) => { T.sydney_location_message = 'shop'; return 'shop' },
            'WednesdayShop',
            { after: 'FridayShop' }
          )
          .when(
            date => corruption > 40 && date.weekDay === 2 && V.sydney.rank === 'initiate',
            (date) => { T.sydney_location_message = 'shop'; return 'shop' },
            'TuesdayShop',
            { after: 'WednesdayShop' }
          )
          .when(
            date => true,
            (date) => { T.sydney_location_message = 'temple'; return 'temple' },
            'DefaultTemple',
            { after: 'TuesdayShop' }
          );
      },
      'Shop',
      { after: 'NoSchoolTerm' }
    )
    .when(
      (date) => date.weekDay === 6 && date.isHourBetween(16, 19),
      (date) => V.adultshophelped === 1 ? 'temple' : 'shop',
      'Friday',
      { after: 'Shop' }
    )
    .when(
      (date) => date.weekDay === 7,
      (date) => {
        return date.schedule
          .when(
            date => V.adultshopopeningsydney === true && date.isBefore([21, 0]),
            'shop',
            'SaturdayShop',
            { after: 'default' }
          )
          .at([6, 23], 'temple');
      },
      'Saturday',
      { after: 'Friday' }
    )
    .when(
      (date) => date.weekDay === 1,
      'temple',
      'Sunday',
      { after: 'Saturday' }
    )
    .when(
      (date) => V.englishPlay === 'ongoing' && V.englishPlayDays === 0 &&
        date.isHourBetween(17, 20),
      'englishPlay',
      'EnglishPlay',
      { after: 'Sunday' }
    )
    .when(
      (date) => V.daily.sydney.punish === 1,
      (date) => { T.sydney_location_message = 'home'; return 'home' },
      'Punish',
      { override: true }
    )
    .when(
      (date) => V.sydney_location_override && V.replayScene,
      (date) => V.sydney_location_override,
      'DEBUG',
      { override: true }
    );

  // Kylar 的日程
  maplebirch.npc.Schedules.add('Kylar', [0, 23], '')
    .when(
      () => true,
      (date) => {
        const location = getKylarLocation();
        if (C.npc.Kylar.state === 'prison') return 'prison';
        return location.area || '';
      },
      'KylarSchedule',
      {}
    );

  // Whitney的日程表
  maplebirch.npc.Schedules.add('Whitney', [0, 23], '')
    .when(
      () => C.npc.Whitney.state === 'dungeon',
      'dungeon',
      'Dungeon',
      { after: 'default' }
    )
    .when(
      () => C.npc.Whitney.state === 'pillory',
      'pillory',
      'Pillory',
      { after: 'Dungeon' }
    )
    .when(
      (date) => date.weekDay === 1 && date.isAfter([21,0]) && C.npc.Whitney.state === 'active',
      'bar',
      'SundayBar',
      { after: 'Pillory' }
    )
    .when(
      (date) => Weather.precipitation !== 'none' && date.day && !V.daily.whitney.park && V.pillory.tenant.special.name !== 'Whitney',
      (date) => 'park',
      'RainyPark',
      { after: 'SundayBar' }
    )
    .when(
      (date) => date.schoolDay && date.isHourBetween(9, 15),
      (date) => {
        if (date.isHour(10)) V.whitneymaths === 'absent' ? 'school math absent' : 'school math class';
        if (date.isHour(12) && V.daily.whitney.roofLeave !== true) return 'school roof';
        if (V.bullytimer >= 1 && V.bullytimeroutside >= 1 && V.daily.whitney.bullyGate !== 1) return 'school front';
        return 'school';
      },
      'SchoolSchedule',
      { after: 'RainyPark' }
    ).when(
      (date) => V.halloween === 1 && date.month === 31 && date.isAfter([19, 0]) && V.halloween_whitney_proposed !== 1 && V.halloween_kylar_whitney !== 1 && !V.possessed,
      'halloween',
      'Halloween',
      { after: 'SchoolSchedule' }
    )
    .when(
      (date) => date.isHourBetween(16, 20) && !date.schoolDay && !V.daily.whitney.park,
      (date) => 'alley',
      'Alley',
      { after: 'Halloween' }
    )
    .when(
      (date) => V.whitneyromance >= 1 && !V.weekly.adultShopWhitney && V.adultshopstate !== 'sydney' && C.npc.Whitney.dom >= 10,
      'adult shop',
      'AdultShop',
      { after: 'Alley' }
    )
})();