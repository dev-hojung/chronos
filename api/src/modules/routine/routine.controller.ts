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
import { RoutineService } from './routine.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { CompleteRunDto } from './dto/complete-run.dto';
import { ListRunsDto } from './dto/list-runs.dto';

@UseGuards(JwtAuthGuard)
@Controller('routines')
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Post()
  createRoutine(@Body() dto: CreateRoutineDto, @CurrentUser() user: JwtPrincipal) {
    return this.routineService.createRoutine(user.userId, dto);
  }

  @Get()
  listRoutines(@CurrentUser() user: JwtPrincipal) {
    return this.routineService.listRoutines(user.userId);
  }

  @Get('upcoming')
  getUpcoming(@CurrentUser() user: JwtPrincipal) {
    return this.routineService.getUpcomingRuns(user.userId, 7);
  }

  @Get('runs')
  listRuns(@Query() query: ListRunsDto, @CurrentUser() user: JwtPrincipal) {
    return this.routineService.listRuns(user.userId, query);
  }

  @Post('runs')
  recordRun(@Body() dto: CompleteRunDto, @CurrentUser() user: JwtPrincipal) {
    return this.routineService.recordRun(user.userId, dto);
  }

  @Get(':id')
  getRoutine(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.routineService.getRoutine(user.userId, id);
  }

  @Patch(':id')
  updateRoutine(
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
    @CurrentUser() user: JwtPrincipal,
  ) {
    return this.routineService.updateRoutine(user.userId, id, dto);
  }

  @Delete(':id')
  deleteRoutine(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.routineService.deleteRoutine(user.userId, id);
  }

  // ── Proposals ─────────────────────────────────────────────────────────────

  @Post('analyze')
  analyzeRoutines(@CurrentUser() user: JwtPrincipal) {
    return this.routineService.analyzeAndProposeForUser(user.userId);
  }

  @Get('proposals')
  listProposals(@CurrentUser() user: JwtPrincipal) {
    return this.routineService.listProposals(user.userId);
  }

  @Post('proposals/:id/revert')
  revertProposal(@Param('id') id: string, @CurrentUser() user: JwtPrincipal) {
    return this.routineService.revertProposal(user.userId, id);
  }
}
