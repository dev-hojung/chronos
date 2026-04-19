import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPrincipal } from '../auth/jwt.strategy';
import { GoalService } from './goal.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AddContributionDto } from './dto/add-contribution.dto';
import { ListContributionsDto } from './dto/list-contributions.dto';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  createGoal(@Body() dto: CreateGoalDto, @CurrentUser() user: JwtPrincipal) {
    return this.goalService.createGoal(user.userId, dto);
  }

  @Get()
  listGoals(
    @Query('includeArchived') includeArchived: string,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.goalService.listGoals(user.userId, includeArchived === 'true');
  }

  // contributions 목록 — /:id 앞에 위치해야 라우팅 충돌 없음
  @Get('contributions')
  listContributions(
    @Query() query: ListContributionsDto,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.goalService.listContributions(user.userId, query);
  }

  @Delete('contributions/:id')
  removeContribution(
    @Param('id') id: string,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.goalService.removeContribution(user.userId, id);
  }

  @Get(':id')
  getGoal(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.goalService.getGoal(user.userId, id);
  }

  @Patch(':id')
  updateGoal(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.goalService.updateGoal(user.userId, id, dto);
  }

  @Delete(':id')
  deleteGoal(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.goalService.deleteGoal(user.userId, id);
  }

  @Post(':id/contributions')
  addContribution(
    @Param('id') id: string,
    @Body() dto: AddContributionDto,
    @CurrentUser() user: JwtPrincipal,
  ) {
    // goalId는 URL path에서 가져옴
    return this.goalService.addContribution(user.userId, { ...dto, goalId: id });
  }

  @Get(':id/progress')
  getProgress(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.goalService.getProgress(user.userId, id);
  }
}
